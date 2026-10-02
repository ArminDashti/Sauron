# @aaif/sauron-acp

Install and resolve the Sauron executable through npm.

This package distributes the Sauron CLI using platform-specific optional npm
dependencies. It does not contain or depend on the Sauron ACP client.

## Installation

```bash
npm install @aaif/sauron-acp
```

The matching `@aaif/sauron-binary-*` package is installed automatically. Do not
install a platform package directly; `@aaif/sauron-acp` provides the supported
`sauron` command.

## Usage

Run the Sauron CLI installed by the package:

```bash
npx sauron acp
npx sauron serve
```

The launcher forwards arguments and standard input, output, and error streams to
the native executable. It preserves the executable's exit status and forwards
termination signals.

Resolve the executable path programmatically:

```typescript
import { resolveSauronBinary } from "@aaif/sauron-acp";

const binaryPath = resolveSauronBinary();
```

`resolveSauronBinary()` first uses `SAURON_BINARY` when it is set. Otherwise, it
selects the package matching `process.platform` and `process.arch`. In both
cases it verifies that the executable exists and returns an absolute path.

Use the override to run a locally built or custom Sauron executable:

```bash
SAURON_BINARY=/path/to/sauron npx sauron acp
```

`SAURON_BINARY` must point directly to a native Sauron executable, not a
`node_modules/.bin/sauron` command shim.

Supported platforms:

| Operating system | Architecture |
| ---------------- | ------------ |
| macOS            | ARM64        |
| macOS            | x64          |
| Linux            | ARM64        |
| Linux            | x64          |
| Windows          | x64          |

Package managers must install optional dependencies. If optional dependencies
are disabled, the resolver reports which platform package is missing.
