import type { ToolListItem, ToolPermissionEntry, ToolPermissionLevel } from '@aaif/sauron-acp-client';
import { getAcpClient } from './acpConnection';

export type { ToolListItem, ToolPermissionEntry, ToolPermissionLevel };

export async function listTools(sessionId: string, extensionName?: string): Promise<ToolListItem[]> {
  const client = await getAcpClient();
  const response = await client.sauron.toolsList_unstable({
    sessionId,
    extensionName: extensionName ?? null,
  });
  return response.tools ?? [];
}

export async function setToolPermissions(toolPermissions: ToolPermissionEntry[]): Promise<void> {
  const client = await getAcpClient();
  await client.sauron.toolsPermissionsSet_unstable({ toolPermissions });
}
