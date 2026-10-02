import type { SauronMcpHostCapabilities } from "./mcp-apps.js";

export interface SauronClientCapabilitiesMeta {
  sauron?: {
    mcpHostCapabilities?: SauronMcpHostCapabilities;
    customNotifications?: boolean;
  };
}
