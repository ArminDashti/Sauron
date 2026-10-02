import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/app-bridge";
import type {
  McpUiAppResourceConfig,
  McpUiAppToolConfig,
} from "@modelcontextprotocol/ext-apps/server";
import type {
  BlobResourceContents,
  ReadResourceResult,
  TextResourceContents,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

export const SAURON_MCP_UI_EXTENSION_ID = "io.modelcontextprotocol/ui" as const;

export interface SauronMcpUiExtensionSettings {
  mimeTypes: string[];
}

export interface SauronMcpHostCapabilities {
  extensions: Record<string, SauronMcpUiExtensionSettings>;
}

export type SauronToolUiMetadata = Extract<
  McpUiAppToolConfig["_meta"],
  { ui: unknown }
>["ui"];

export type SauronToolMetadata = NonNullable<Tool["_meta"]> & {
  ui?: SauronToolUiMetadata;
  sauron_extension?: string;
};

export type SauronSessionTool = Tool & {
  meta?: SauronToolMetadata;
  _meta?: SauronToolMetadata;
};

export type SauronTextResourceContents = TextResourceContents;

export type SauronBlobResourceContents = BlobResourceContents;

export type SauronResourceContents = TextResourceContents | BlobResourceContents;

export type SauronReadResourceResult = ReadResourceResult;

export type SauronResourceMetadata = NonNullable<
  Extract<NonNullable<McpUiAppResourceConfig["_meta"]>, { ui?: unknown }>["ui"]
>;

export interface SauronMcpAppToolPayload {
  toolName: string;
  extensionName: string;
  resourceUri: string;
  toolMeta?: SauronToolMetadata;
  resourceResult?: SauronReadResourceResult | null;
  readError?: string;
}

export interface SauronToolCallUpdateMeta {
  sauron?: {
    mcpApp?: SauronMcpAppToolPayload;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const DEFAULT_SAURON_MCP_HOST_CAPABILITIES: SauronMcpHostCapabilities = {
  extensions: {
    [SAURON_MCP_UI_EXTENSION_ID]: {
      mimeTypes: [RESOURCE_MIME_TYPE],
    },
  },
};
