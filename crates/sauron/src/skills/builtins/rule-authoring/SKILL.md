---
name: rule-authoring
description: Create, edit, rename, or delete sauron rules — short always-on instructions that apply to every turn without being loaded. Use whenever the user asks for a rule, wants a behaviour to always hold, or asks to change or remove an existing rule.
---

A rule is a short, standing instruction that is injected into the system prompt
on every turn. The agent does not have to load it, so it costs prompt budget
on every request.

Use a rule only for something that should hold *always*. Anything that should
only happen during a specific kind of task belongs in a **skill** (see
`skill-authoring`). Repository-specific conventions belong in `AGENTS.md`.

## Layout

```
<rules-dir>/<rule-name>.md
```

Rules are discovered in these directories, first match per name wins:

| Scope | Path |
| --- | --- |
| Project | `<project>/.agents/rules/` |
| Global | the sauron config directory, under `rules/` |

Users manage rules in **Studio → Rules**. Writing the file yourself is
equivalent and shows up there immediately.

## Format

```markdown
---
name: no-force-push
description: Never force-push to a shared branch.
---

Do not run `git push --force` or `git push -f` on `main` or any shared branch.
If a push is rejected, pull and rebase instead, and ask before force-pushing a
local branch.
```

- `name` is **required** and must be lowercase letters, digits and hyphens only,
  at most 64 characters, with no leading or trailing hyphen. A file without a
  `name` is skipped.
- The file name (without `.md`) must match `name`.
- `description` is a short label shown in Studio.
- Anything else in the frontmatter is preserved as metadata, but nothing acts
  on it yet — keep rules in the body.

## Writing a good rule body

- **Imperative and specific.** "Use `anyhow::Result` for errors" beats "handle
  errors well".
- **Short.** A handful of lines. If it needs a table, an example and a
  rationale, it is a document — make it a skill or put it in `AGENTS.md`.
- **No conditional chatter.** Do not write "if you are working on Rust, …";
  pick the scope when you create the rule.
- **No conflicts.** Two rules that contradict each other produce incoherent
  behaviour. Check existing rules before adding one.
- **Verifiable.** Say what "done" looks like so the agent can tell whether it
  complied.

## Editing and renaming

Rewrite the file. To rename, change both the file name and the `name:` field
in the same edit.

## Deleting

Delete the file.

## Before you finish

- Confirm `name` is present, kebab-case, and matches the file name.
- Confirm the body is short enough to sit in every prompt.
- Tell the user rules take effect on the next turn, and that existing
  conversations keep the copy they already started with.
