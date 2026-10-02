use include_dir::{include_dir, Dir};
use std::path::PathBuf;
use tracing::warn;

static BUILTIN_SKILLS_DIR: Dir = include_dir!("$CARGO_MANIFEST_DIR/src/skills/builtins");

pub struct BuiltinSkill {
    pub name: String,
    pub content: String,
}

/// Built-in skills are authored as `<name>/SKILL.md` and compiled into the
/// binary. The directory name is the skill name; the frontmatter `name` must
/// match it.
pub fn get_all() -> Vec<BuiltinSkill> {
    BUILTIN_SKILLS_DIR
        .dirs()
        .filter_map(|skill_dir| {
            let name = skill_dir.path().file_name()?.to_str()?.to_string();
            let skill_md = skill_dir.get_file("SKILL.md")?;
            Some(BuiltinSkill {
                name,
                content: skill_md.contents_utf8()?.to_string(),
            })
        })
        .collect()
}

/// Copy the compiled-in built-ins into `Paths::builtin_skills_dir()` so they
/// exist as real files in an app folder. Writes only where the on-disk copy is
/// missing or stale, so repeated calls are cheap and idempotent.
///
/// A folder that cannot be created or written is logged and skipped: the
/// compiled-in copy still backs discovery, so built-ins stay usable even when
/// the data directory is read-only.
pub fn materialize() -> Option<PathBuf> {
    let root = crate::config::paths::Paths::builtin_skills_dir();
    if let Err(error) = std::fs::create_dir_all(&root) {
        warn!(
            "Could not create built-in skills dir {}: {}",
            root.display(),
            error
        );
        return None;
    }

    for skill in get_all() {
        let skill_dir = root.join(&skill.name);
        let skill_file = skill_dir.join("SKILL.md");
        let is_current = std::fs::read_to_string(&skill_file)
            .map(|existing| existing == skill.content)
            .unwrap_or(false);
        if is_current {
            continue;
        }
        if let Err(error) = std::fs::create_dir_all(&skill_dir)
            .and_then(|()| std::fs::write(&skill_file, &skill.content))
        {
            warn!(
                "Could not materialize built-in skill '{}' into {}: {}",
                skill.name,
                skill_dir.display(),
                error
            );
        }
    }

    Some(root)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_builtin_skill_declares_its_directory_name() {
        for skill in get_all() {
            assert!(
                skill.content.starts_with("---\n"),
                "built-in skill '{}' must start with frontmatter",
                skill.name
            );
            assert!(
                skill.content.contains(&format!("name: {}", skill.name)),
                "built-in skill '{}' must declare a matching frontmatter name",
                skill.name
            );
        }
    }

    #[test]
    fn studio_authoring_skills_are_built_in() {
        let names: Vec<&str> = get_all().iter().map(|skill| skill.name.as_str()).collect();
        assert!(names.contains(&"skill-authoring"));
        assert!(names.contains(&"rule-authoring"));
    }
}
