//! Filesystem-backed rules: short, always-on instructions that are injected
//! into the agent's system prompt. Unlike a skill (loaded on demand through
//! `load_skill`), a rule applies to every turn.
//!
//! Rules live in `<configDir>/rules/<name>.md` (global) or
//! `<project>/.agents/rules/<name>.md` (project-scoped). User-facing CRUD lives
//! in `crate::sources`, which generalizes across source types.

use crate::config::paths::Paths;
use crate::sources::parse_frontmatter;
use agent_client_protocol::Error;
use sauron_sdk_types::custom_requests::{SourceEntry, SourceType};
use serde::Deserialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use tracing::warn;

#[derive(Debug, Deserialize)]
pub struct RuleFrontmatter {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub description: String,
    #[serde(flatten)]
    pub properties: HashMap<String, Value>,
}

/// Canonical writable location for global rules.
pub fn global_rules_dir() -> PathBuf {
    Paths::in_config_dir("rules")
}

/// Canonical writable location for project-scoped rules.
pub fn project_rules_dir(project_dir: &Path) -> PathBuf {
    project_dir.join(".agents").join("rules")
}

pub(crate) fn rule_base_dir(global: bool, project_dir: Option<&str>) -> Result<PathBuf, Error> {
    if global {
        return Ok(global_rules_dir());
    }
    let project_dir = project_dir
        .filter(|dir| !dir.trim().is_empty())
        .ok_or_else(|| {
            Error::invalid_params().data("projectDir is required when global is false")
        })?;
    Ok(project_rules_dir(Path::new(project_dir)))
}

pub(crate) fn validate_rule_name(name: &str) -> Result<(), Error> {
    crate::sources::validate_kebab_name("Rule", name)
}

/// Rule directories in discovery order: project first so a project rule wins
/// over a global rule of the same name.
fn all_rule_dirs(working_dir: Option<&Path>) -> Vec<(PathBuf, bool)> {
    let mut dirs = Vec::new();
    if let Some(working_dir) = working_dir {
        dirs.push((project_rules_dir(working_dir), false));
    }
    dirs.push((global_rules_dir(), true));
    dirs
}

pub(crate) fn build_rule_md(
    name: &str,
    description: &str,
    content: &str,
    properties: &HashMap<String, Value>,
) -> String {
    let mut frontmatter = serde_yaml::Mapping::new();
    frontmatter.insert(
        serde_yaml::Value::String("name".into()),
        serde_yaml::Value::String(name.into()),
    );
    frontmatter.insert(
        serde_yaml::Value::String("description".into()),
        serde_yaml::Value::String(description.into()),
    );
    for (key, value) in properties {
        if key == "name" || key == "description" {
            continue;
        }
        let Ok(value) = serde_yaml::to_value(value) else {
            continue;
        };
        frontmatter.insert(serde_yaml::Value::String(key.clone()), value);
    }

    let yaml = serde_yaml::to_string(&frontmatter).unwrap_or_default();
    let mut md = format!("---\n{yaml}---\n");
    if !content.is_empty() {
        md.push('\n');
        md.push_str(content);
        md.push('\n');
    }
    md
}

fn parse_rule_content(content: &str, path: &Path, global: bool) -> Option<SourceEntry> {
    let (frontmatter, body): (RuleFrontmatter, String) = match parse_frontmatter(content) {
        Ok(Some(parsed)) => parsed,
        Ok(None) => return None,
        Err(error) => {
            warn!(
                "Failed to parse rule frontmatter in '{}': {}",
                path.display(),
                error
            );
            return None;
        }
    };

    let name = match frontmatter.name.filter(|name| !name.is_empty()) {
        Some(name) => name,
        None => {
            warn!(
                "Rule at '{}' is missing a required 'name' in frontmatter, skipping",
                path.display()
            );
            return None;
        }
    };

    Some(SourceEntry {
        source_type: SourceType::Rule,
        name,
        description: frontmatter.description,
        content: body,
        path: path.to_string_lossy().into_owned(),
        global,
        writable: true,
        supporting_files: Vec::new(),
        properties: frontmatter.properties,
    })
}

fn scan_rules_from_dir(dir: &Path, global: bool, seen: &mut HashSet<String>) -> Vec<SourceEntry> {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut sources = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("md") {
            continue;
        }
        let content = match std::fs::read_to_string(&path) {
            Ok(content) => content,
            Err(error) => {
                warn!("Failed to read rule file {}: {}", path.display(), error);
                continue;
            }
        };
        let Some(source) = parse_rule_content(&content, &path, global) else {
            continue;
        };
        if seen.contains(&source.name) {
            continue;
        }
        seen.insert(source.name.clone());
        sources.push(source);
    }
    sources
}

/// Discover rules from the project and global rule directories.
pub fn discover_rules(working_dir: Option<&Path>) -> Vec<SourceEntry> {
    let mut seen = HashSet::new();
    let mut sources = Vec::new();
    for (dir, global) in all_rule_dirs(working_dir) {
        sources.extend(scan_rules_from_dir(&dir, global, &mut seen));
    }
    sources
}

/// Render discovered rules as a system prompt section.
pub fn rules_instructions(working_dir: &Path) -> Option<String> {
    let rules = discover_rules(Some(working_dir));
    if rules.is_empty() {
        return None;
    }

    let mut instructions = String::from(
        "# Rules\n\nThese rules always apply. Follow them unless the user explicitly \
         asks you to do otherwise.",
    );
    for rule in rules {
        instructions.push_str(&format!("\n\n## {}\n", rule.name));
        if !rule.description.is_empty() {
            instructions.push_str(&format!("{}\n", rule.description));
        }
        if !rule.content.is_empty() {
            instructions.push_str(&format!("\n{}\n", rule.content));
        }
    }
    Some(instructions)
}

fn canonicalize_or_original(path: &Path) -> PathBuf {
    std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf())
}

/// A path is a user-managed rule only when it is a `.md` file sitting directly
/// in a `rules` directory: the global one, or a project's `.agents/rules`.
/// Rejecting everything else keeps update/delete from touching arbitrary files.
pub(crate) fn resolve_rule_file(path: &str) -> Result<PathBuf, Error> {
    if path.is_empty() {
        return Err(Error::invalid_params().data("Source path must not be empty"));
    }

    let canonical = Path::new(path)
        .canonicalize()
        .map_err(|_| Error::invalid_params().data(format!("Source \"{path}\" not found")))?;

    if !is_user_rule_file(&canonical) {
        return Err(Error::invalid_params().data(format!("Source \"{path}\" not found")));
    }

    Ok(canonical)
}

fn is_user_rule_file(canonical: &Path) -> bool {
    if !canonical.is_file() || canonical.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return false;
    }
    let Some(parent) = canonical.parent() else {
        return false;
    };
    if parent.file_name().and_then(|name| name.to_str()) != Some("rules") {
        return false;
    }
    if canonicalize_or_original(parent) == canonicalize_or_original(&global_rules_dir()) {
        return true;
    }
    parent
        .parent()
        .and_then(|grandparent| grandparent.file_name())
        .and_then(|name| name.to_str())
        == Some(".agents")
}

pub(crate) fn is_global_rule_file(path: &Path) -> bool {
    path.parent().is_some_and(|parent| {
        canonicalize_or_original(parent) == canonicalize_or_original(&global_rules_dir())
    })
}

/// Split a rule file into its name, description, body, and extra properties.
/// Falls back to an empty name/description when the file has no frontmatter.
pub(crate) fn parse_rule_frontmatter(
    raw: &str,
) -> (String, String, String, HashMap<String, Value>) {
    match parse_frontmatter::<RuleFrontmatter>(raw) {
        Ok(Some((frontmatter, body))) => (
            frontmatter.name.unwrap_or_default(),
            frontmatter.description,
            body,
            frontmatter.properties,
        ),
        _ => (
            String::new(),
            String::new(),
            raw.to_string(),
            HashMap::new(),
        ),
    }
}

/// Read the properties bag out of an existing rule file so an update that
/// omits properties does not erase them.
pub(crate) fn read_rule_properties(path: &Path) -> HashMap<String, Value> {
    match std::fs::read_to_string(path) {
        Ok(raw) => {
            let (_, _, _, properties) = parse_rule_frontmatter(&raw);
            properties
        }
        Err(_) => HashMap::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write_rule(dir: &Path, name: &str, description: &str, content: &str) -> PathBuf {
        let dir = dir.join("rules");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join(format!("{name}.md"));
        let mut file = std::fs::File::create(&path).unwrap();
        write!(
            file,
            "---\nname: {name}\ndescription: {description}\n---\n\n{content}\n"
        )
        .unwrap();
        path
    }

    #[test]
    fn rules_instructions_are_empty_without_rules() {
        let working_dir = tempfile::tempdir().unwrap();
        assert!(rules_instructions(working_dir.path()).is_none());
    }

    #[test]
    fn rule_content_and_description_round_trip() {
        let working_dir = tempfile::tempdir().unwrap();
        let dir = working_dir.path().join(".agents");
        std::fs::create_dir_all(&dir).unwrap();
        write_rule(
            &dir,
            "tests-first",
            "Always write tests",
            "Write the test before the fix.",
        );

        let rules = discover_rules(Some(working_dir.path()));
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].name, "tests-first");
        assert_eq!(rules[0].description, "Always write tests");
        assert_eq!(rules[0].content, "Write the test before the fix.");
        assert!(!rules[0].global);

        let instructions = rules_instructions(working_dir.path()).unwrap();
        assert!(instructions.contains("## tests-first"));
        assert!(instructions.contains("Write the test before the fix."));
    }

    #[test]
    fn rule_without_a_name_is_skipped() {
        let working_dir = tempfile::tempdir().unwrap();
        let dir = working_dir.path().join(".agents").join("rules");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(
            dir.join("nameless.md"),
            "---\ndescription: no name here\n---\n\nbody\n",
        )
        .unwrap();

        assert!(discover_rules(Some(working_dir.path())).is_empty());
    }

    #[test]
    fn project_rule_shadows_global_rule_of_the_same_name() {
        let global_root = tempfile::tempdir().unwrap();
        let working_dir = tempfile::tempdir().unwrap();

        write_rule(
            &global_root.path().join("global"),
            "shared",
            "global",
            "global body",
        );
        write_rule(
            &working_dir.path().join(".agents"),
            "shared",
            "project",
            "project body",
        );

        let rules = discover_rules(Some(working_dir.path()));
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].description, "project");
        assert!(!rules[0].global);
    }

    #[test]
    fn build_rule_md_keeps_extra_frontmatter_properties() {
        let mut properties = HashMap::new();
        properties.insert("appliesTo".to_string(), serde_json::json!("src/**"));
        let md = build_rule_md("ts-only", "TypeScript only", "body", &properties);

        let (frontmatter, content) = parse_frontmatter::<RuleFrontmatter>(&md).unwrap().unwrap();
        assert_eq!(frontmatter.name.as_deref(), Some("ts-only"));
        assert_eq!(frontmatter.properties["appliesTo"], "src/**");
        assert_eq!(content, "body");
    }

    #[test]
    fn resolve_rule_file_rejects_paths_outside_rule_directories() {
        let working_dir = tempfile::tempdir().unwrap();
        let stray = working_dir.path().join("notes.md");
        std::fs::write(&stray, "not a rule").unwrap();
        assert!(resolve_rule_file(&stray.to_string_lossy()).is_err());
        assert!(resolve_rule_file("").is_err());

        let legit = write_rule(&working_dir.path().join(".agents"), "ok", "fine", "body");
        let resolved = resolve_rule_file(&legit.to_string_lossy()).unwrap();
        assert_eq!(resolved, legit.canonicalize().unwrap());
    }
}
