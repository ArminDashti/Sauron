# @aaif/sauron-acp-client

TypeScript client library for communicating with Sauron over an existing Agent
Client Protocol (ACP) transport.

This package provides:

- TypeScript types and Zod validators for Sauron ACP extension methods
- `SauronExtClient` for calling Sauron extension methods
- Client capability definitions and MCP Apps helpers

It does not install, resolve, or start the Sauron executable. Applications own
the transport and process lifecycle.

## Installation

```bash
npm install @aaif/sauron-acp-client @agentclientprotocol/sdk
```

## Usage

Compose the Sauron extension client with the standard ACP SDK:

```typescript
import {
  client as createAcpClient,
  methods,
  PROTOCOL_VERSION,
  type Stream,
} from "@agentclientprotocol/sdk";
import { SauronExtClient } from "@aaif/sauron-acp-client";

async function connectToSauron(stream: Stream) {
  const app = createAcpClient({ name: "my-product" });
  const connection = app.connect(stream);
  const sauron = new SauronExtClient(connection.agent);

  await connection.agent.request(methods.agent.initialize, {
    protocolVersion: PROTOCOL_VERSION,
    clientInfo: {
      name: "my-product",
      version: "1.0.0",
    },
    clientCapabilities: {},
  });

  return { connection, sauron };
}
```

The application creates and owns the `stream`, including its connection and
process lifecycle. Call `connection.close()` when the application no longer
needs the connection.

## Development

From `ui/sauron-acp-client`:

```bash
pnpm run build
```

The generated TypeScript types come from the Rust schemas in `crates/sauron`.
