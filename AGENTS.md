# AGENTS Instructions

sauron is an AI agent framework in Rust with CLI and Electron desktop interfaces.

## Contribution Workflow

The issue is the source of truth for work intended for an upstream pull request. Track issue status on the [Sauron Issues board](https://github.com/users/ArminDashti/projects/1).

- Before implementing an issue for a pull request, confirm that it is on the board with Status **Ready**.
- Do not implement issues in **Inbox**, **Needs info**, or **Accepted / design**. Help resolve the issue discussion instead.
- Read the agreed design, constraints, non-goals, and verification plan before changing code.
- Keep the implementation within the issue's agreed scope.
- If implementation reveals a material design change, return to the issue before continuing.
- Every external pull request must link the Ready issue it implements and explain how the verification plan was performed.
- Structure new issues on the matching template in `.github/ISSUE_TEMPLATE/` and set the issue type (e.g. Bug, Feature). `gh issue create` does not apply templates automatically.

Maintainer-directed work, urgent security fixes, release automation, and local or exploratory changes do not require a Ready issue.

## MCP Server Directory

sauron is retiring its project-specific MCP server directory in favor of the [official MCP Registry](https://github.com/modelcontextprotocol/registry) and its `server.json` format.

- Do not add new third-party servers to `documentation/static/servers.json`; these contributions are no longer accepted.
- Direct server authors to publish to the official MCP Registry instead.
- Treat the existing sauron directory as legacy data while registry-backed discovery and installation are implemented.
- Changes that maintain, migrate, or remove existing directory entries are allowed when they support the migration and are within an approved issue's scope.

See [Discussion #10830](https://github.com/ArminDashti/Sauron/discussions/10830) for the decision and migration direction.

## GitHub Communication

Write issue and pull request comments for humans, not as exhaustive work logs.

- Lead with the conclusion or action needed.
- Keep comments concise; do not repeat context already present in the thread.
- Use short paragraphs or bullets, and include implementation details only when they affect a decision or review.
- Prefer one clear summary over multiple incremental comments.

## Agent Loop Migration

We are replacing the legacy agent loop in `crates/sauron/src/agents/agent.rs` with the state machine in `crates/sauron/src/agents/state_machine/`. The state-machine path is enabled with `SAURON_STATE_MACHINE=1`.

Until the migration is complete, changes to agent-loop behavior must be implemented and tested in both paths. When reviewing code, check whether a change to either path also applies to the other and flag missing parity.

## Setup
```bash
source bin/activate-hermit
cargo build
```

## Commands

### Build
```bash
cargo build                   # debug
cargo build --release         # release  
just release-binary           # release binary
```

### Test
```bash
cargo test                   # all tests
cargo test -p sauron          # specific crate
cargo test --package sauron --test mcp_integration_test
just record-mcp-tests        # record MCP
```

### Lint/Format
```bash
cargo fmt
cargo clippy --all-targets -- -D warnings
```

### UI
```bash
just run-ui                  # start desktop
cd ui/desktop && pnpm run typecheck
cd ui/desktop && pnpm test   # test UI
```

## Structure
```
crates/       # Rust workspace members — see root Cargo.toml (`members = ["crates/*"]`)
ui/desktop/   # Electron app
ui/text/      # deprecated ACP TUI (see ui/text/README.md)
```

Some workspace crates, including those that make up the GDK, are published to crates.io and expose public APIs. The authoritative list of GDK crates is the `release = true`, `version_group = "gdk"` package set in `release-plz.toml`, which drives the GDK release; run `python3 crates/sauron-sdk/scripts/gdk-release.py crates` to print it. Other crates, such as `sauron` and `sauron-cli`, do not provide stable public APIs; their `pub` items are internal implementation details and may change without notice.

## Development Loop
```bash
# 1. source bin/activate-hermit
# 2. Make changes
# 3. cargo fmt
```

### Run these only if the user has asked you to build/test your changes:
```
# 1. cargo build
# 2. cargo test -p <crate>
# 3. cargo clippy --all-targets -- -D warnings
```

## Rules

- Test: Prefer tests/ folder, e.g. crates/sauron/tests/
- Test: When adding features, update sauron-self-test.yaml, rebuild, then run `sauron run --recipe sauron-self-test.yaml` to validate
- Error: Use anyhow::Result
- Provider: Implement Provider trait see providers/base.rs
- MCP: Built-in servers in crates/sauron/src/builtin_servers/
- UI Desktop: Use ACP SDK types or local `src/types/*` types. Do not import generated OpenAPI types/client code from `ui/desktop/src/api`

## Code Quality

- Comments: Write self-documenting code - prefer clear names over comments
- Comments: Never add comments that restate what code does
- Comments: Only comment for complex algorithms, non-obvious business logic, or "why" not "what"
- Simplicity: Don't make things optional that don't need to be - the compiler will enforce
- Simplicity: Booleans should default to false, not be optional
- Errors: Don't add error context that doesn't add useful information (e.g., `.context("Failed to X")` when error already says it failed)
- Simplicity: Avoid overly defensive code - trust Rust's type system
- Logging: Clean up existing logs, don't add more unless for errors or security events

## Never

- Never: Recreate `ui/desktop/src/api` or add `@hey-api/openapi-ts` to `ui/desktop`
- Cargo.toml: For human-authored dependency changes, use `cargo add` instead of manually editing dependency entries unless there is a specific reason not to.
- Cargo.toml: Automated dependency bump PRs are exempt; when manual edits are necessary, keep `Cargo.lock` consistent.
- Never: Skip cargo fmt
- Never: Merge without running clippy
- Never: Comment self-evident operations (`// Initialize`, `// Return result`), getters/setters, constructors, or standard Rust idioms
- Never: Overwrite a live binary in place (e.g. `cp`/`fs.copyFileSync` onto an existing executable) - unlink or atomic-rename the destination first, otherwise macOS SIGKILLs running processes with "Code Signature Invalid"

## Entry Points
- CLI: crates/sauron-cli/src/main.rs
- UI: ui/desktop/src/main.ts
- Agent: crates/sauron/src/agents/agent.rs

# Self-learning (for AI coding agents)

This file makes any coding agent **self-improving**: recognize a hard-won
"golden path" during a task and persist it so the next session starts already
knowing it, instead of rediscovering how to reach the DB, where the creds live,
how to deploy, or how to verify a change live.

It works with any agent that reads a standing instructions file (Codex, Zed,
Aider, Gemini CLI, …). Richer, tool-native installs exist too — a Claude Code
**skill** (`skills/self-learning/SKILL.md`) and a **Cursor rule**
(`.cursor/rules/self-learning.mdc`); see the README. This file is the portable,
lowest-common-denominator version.

## The loop

**1. Recognize the moment.** Any one of these is a cue:
- a task only worked after several attempts, wrong turns, or a correction;
- you discovered project facts you didn't know up front — where creds/env vars
  live, a non-obvious command, a required sequence, a gotcha;
- an operational workflow likely to recur (reach the dev/prod DB, deploy, run
  migrations, seed data, verify live, tail the right logs);
- the user says "remember this" / "don't make me re-explain this next time".

Act on the cue immediately — **don't ask permission first**. Capture it, then
tell the user what you saved and where. They can always edit or delete it.

**2. Capture it where your tool auto-loads knowledge next session:**
- Claude Code / any Agent Skills client → a new `skills/<name>/SKILL.md`
- Cursor → a new `.cursor/rules/learned/<name>.mdc`
- Otherwise → append a dated entry under [Learned](#learned) below, or to your
  project's notes/memory file.

Capture the **procedure** (commands, paths, the required order, gotchas) — not a
one-off answer — and the **failures** too: the approaches you ruled out and why,
so next time skips the dead-ends.

**3. Reuse.** Next session the persisted entry loads automatically (by skill/rule
description, or because this file is always read) and you start from the golden
path.

## Promotion rule

A saved entry is authoritative — future sessions trust it without re-deriving it.
Only promote a session to a durable entry when **all three** hold:

1. **A passing check** — the path was actually verified (a test passed, the
   command exited clean, the repro reproduced, the build went green). Record it.
   "Seemed to work" doesn't count.
2. **A named failure pattern** — you can name the failure it avoids or diagnoses,
   not a vague "sometimes it breaks".
3. **At least one ruled-out dead-end** — a concrete approach you tried and
   eliminated, with the reason.

If any is missing, it isn't durable yet — leave a tentative note (marked
unverified) or skip it. This keeps confident guesses out.

## Rules

- **Never write secret values** — no tokens, passwords, connection strings, or
  API keys. Record only *where* a secret lives (env var name, config/selector,
  secret manager). Reproducing a secret into a shared file leaks it.
- **A one-line fact or correction** → put it in lightweight notes/memory, not a
  whole rule or skill.
- **A genuine one-off** unlikely to recur → skip it.
- **Capture procedures, not answers** — teach how to approach the class of
  problem, so it generalizes next time.

## Learned

<!-- When no richer mechanism is available, append dated golden-path entries here.
     Format: ### YYYY-MM-DD — <title>  /  **Goal**, **Steps**, **Gotchas**,
     **What didn't work**. Keep secrets out — point to where they live. -->
