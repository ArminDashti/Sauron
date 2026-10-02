---
name: skill-authoring
description: Create, edit, rename, or delete sauron skills. Use whenever the user asks to make a skill, turn a repeated workflow into a skill, change what a skill does, or remove a skill. Also use when a skill is not showing up, is malformed, or needs its arguments fixed.
---

A skill is a reusable procedure the agent loads on demand. It is not a rule —
a rule always applies (see `rule-authoring`); a skill applies only after the
agent loads it.

## Layout

```
<skills-dir>/<skill-name>/SKILL.md
<skills-dir>/<skill-name>/references/...   # optional supporting files
```

Skills are discovered in these directories, first match wins per name:

| Scope | Path |
| --- | --- |
| Project | `<project>/.agents/skills/` |
| Global | `~/.agents/skills/` |

Users manage skills in **Studio → Skills**. Writing the files yourself is
equivalent and shows up there immediately.

## `SKILL.md` format

```markdown
---
name: release-notes
description: Draft release notes from merged pull requests for a version tag.
metadata:
  argument-hint: "[version-tag]"
  arguments:
    - version-tag
---

1. List the pull requests merged since the previous tag.
2. Group them by Added / Changed / Fixed.
3. Drop anything internal-only or unreleased.

Version: $ARGUMENTS
```

- `name` is **required**. A file without it is skipped with a warning, so a
  skill that never appears in the list almost always has no `name`.
- `name` must be lowercase letters, digits and hyphens only, at most 64
  characters, and must not start or end with a hyphen.
- The directory name and `name` must match. The directory is what Studio shows
  and what `/name` resolves to.
- `description` is what the agent sees when deciding whether to load the skill.
  Write it as a trigger, not a summary: name the situations that should load it.
- Arbitrary extra fields belong under the nested `metadata:` mapping. Reserved
  top-level keys (`name`, `description`) must not be duplicated there.
- Put `argument-hint` and `arguments` under `metadata:` when the skill takes
  input. Then refer to values as `$ARGUMENTS`, `$1`, `$ARGUMENTS[0]`, or
  `$<name>` for a declared named argument.

## Adding supporting files

Any file next to `SKILL.md` becomes loadable as `<skill-name>/<relative/path>`
via the same `load_skill` tool. Keep `SKILL.md` short and push reference
material into separate files that it tells the agent to read on demand.

## Editing and renaming

- Edit `SKILL.md` in place.
- Renaming means renaming the directory *and* the `name:` field together. A
  mismatch breaks `/name` resolution and Studio editing.
- Never leave `name:` empty "temporarily" — an unnamed skill disappears instead
  of erroring.

## Deleting

Remove the whole skill directory. Deleting one leaves orphaned references to a
skill that no longer exists.

## Built-in skills

Sauron ships some skills of its own (for example this one, `web-search`, and
`rule-authoring`). They are materialized into an app data folder, are marked
read-only, and are hidden from Studio. Do not try to edit them — tell the user
what the built-in one does and offer to write a user skill alongside it
instead.

## Before you finish

- Confirm `name` is present, kebab-case, and matches the directory.
- Confirm the description would make an agent load it at the right moment.
- Re-run `/skills` and check the skill is listed.
