import type { ToolCall, ToolCallUpdate } from '@agentclientprotocol/sdk';
import type { TokenState } from '../../types/chat';
import type { Message, NotificationEvent } from '../../types/message';

export type AcpChatStateChange =
  | { type: 'messages'; messages: Message[] }
  | { type: 'tokenState'; tokenState: Partial<TokenState> }
  | { type: 'progressMessage'; message: string | undefined }
  | {
      type: 'sessionInfo';
      name?: string;
      activeRunId?: string | null;
      sauronMode?: string;
    }
  | { type: 'localSteerConfirmed'; messageId: string }
  | { type: 'notification'; notification: NotificationEvent };

export interface AdapterState {
  messages: Message[];
  localSteerTextByMessageId: Map<string, string>;
  toolCallStatesById: Map<string, ToolCallState>;
}

export type ToolCallState = Omit<ToolCallUpdate, '_meta'>;

export interface SauronMessageMeta {
  messageId?: string;
  created?: number;
  outputTokenLimitReached?: boolean;
  fallbackContent?: boolean;
  steer?: boolean;
}

export interface ToolIdentity {
  toolName?: string;
  extensionName?: string;
}

export const DEFAULT_VISIBLE_MESSAGE_METADATA: Message['metadata'] = {
  userVisible: true,
  agentVisible: true,
};

export function messagesChange(state: AdapterState): AcpChatStateChange[] {
  // Pass the live array by reference: the store is the only consumer and it
  // clones on write (applyChatStateChanges). Cloning here as well made every
  // streamed chunk O(messages) twice, which turns session-load replay into
  // O(n^2) on large sessions.
  return [{ type: 'messages', messages: state.messages }];
}

export function cloneMessage(message: Message): Message {
  return {
    ...message,
    content: message.content.map((content) => ({ ...content })),
    metadata: { ...message.metadata },
  };
}

export function getSauronMessageMeta(update: { _meta?: unknown }): SauronMessageMeta {
  if (!isRecord(update._meta)) {
    return {};
  }

  const sauron = update._meta.sauron;
  if (!isRecord(sauron)) {
    return {};
  }

  const outputTokenLimitReached = sauron.outputTokenLimitReached === true;

  return {
    created: typeof sauron.created === 'number' ? sauron.created : undefined,
    messageId: typeof sauron.messageId === 'string' ? sauron.messageId : undefined,
    outputTokenLimitReached: outputTokenLimitReached ? true : undefined,
    fallbackContent: sauron.fallbackContent === true ? true : undefined,
    steer: sauron.steer === true ? true : undefined,
  };
}

export function getSauronActiveRunId(update: { _meta?: unknown }): string | null | undefined {
  if (!isRecord(update._meta)) {
    return undefined;
  }

  const sauron = update._meta.sauron;
  if (!isRecord(sauron) || !('activeRunId' in sauron)) {
    return undefined;
  }

  return typeof sauron.activeRunId === 'string' || sauron.activeRunId === null
    ? sauron.activeRunId
    : undefined;
}

export function getSauronQueuedSteer(update: { _meta?: unknown }): string | undefined {
  if (!isRecord(update._meta)) return undefined;
  const sauron = update._meta.sauron;
  if (!isRecord(sauron) || !isRecord(sauron.queuedSteer)) return undefined;
  return typeof sauron.queuedSteer.messageId === 'string' ? sauron.queuedSteer.messageId : undefined;
}

export function rawInputToArguments(rawInput: unknown): Record<string, unknown> {
  return isRecord(rawInput) ? rawInput : {};
}

export function toolIdentity(update: ToolCall | ToolCallUpdate): ToolIdentity {
  if (!isRecord(update._meta)) {
    return {};
  }

  const sauron = update._meta.sauron;
  if (!isRecord(sauron) || !isRecord(sauron.toolCall)) {
    return {};
  }

  return {
    toolName: typeof sauron.toolCall.toolName === 'string' ? sauron.toolCall.toolName : undefined,
    extensionName:
      typeof sauron.toolCall.extensionName === 'string' ? sauron.toolCall.extensionName : undefined,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
