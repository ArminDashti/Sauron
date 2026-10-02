import { getAcpClient } from './acpConnection';

export type ConfigReadValue = unknown;

export async function acpReadConfig(
  key: string,
  isSecret: boolean = false
): Promise<ConfigReadValue> {
  const client = await getAcpClient();
  const { value } = await client.sauron.configRead_unstable({ key, isSecret });
  if (value == null) {
    return null;
  }
  if (isSecret) {
    return { maskedValue: value as string };
  }
  return value;
}

export async function acpUpsertConfig(
  key: string,
  value: unknown,
  isSecret: boolean = false
): Promise<void> {
  const client = await getAcpClient();
  await client.sauron.configUpsert_unstable({ key, value, isSecret });
}

export async function acpRemoveConfig(key: string, isSecret: boolean): Promise<void> {
  const client = await getAcpClient();
  await client.sauron.configRemove_unstable({ key, isSecret });
}

export async function acpReadAllConfig(): Promise<Record<string, unknown>> {
  const client = await getAcpClient();
  const { config } = await client.sauron.configReadAll_unstable({});
  return config;
}
