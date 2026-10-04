import type {
  SauronSessionNotification_unstable,
  ProviderDeviceCodeNotification_unstable,
} from '@aaif/sauron-acp-client';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import { AppEvents } from '../constants/events';
import { acpChatSessionActions, acpChatSessionStore } from './chatSessionStore';
import { publishLiveVoiceInteractionEnded } from './liveVoiceNotifications';

export function handleAcpSessionNotification(notification: SessionNotification): Promise<void> {
  const sessionNameBeforeNotification = acpChatSessionStore.getSnapshot(notification.sessionId)
    ?.session?.name;
  const updatedName =
    notification.update.sessionUpdate === 'session_info_update'
      ? notification.update.title
      : undefined;
  acpChatSessionActions.applyAcpSessionNotification(notification);

  if (updatedName && updatedName !== sessionNameBeforeNotification) {
    window.dispatchEvent(
      new CustomEvent(AppEvents.SESSION_RENAMED, {
        detail: { sessionId: notification.sessionId, newName: updatedName },
      })
    );
  }

  return Promise.resolve();
}

export function handleAcpSauronSessionNotification(
  notification: SauronSessionNotification_unstable
): Promise<void> {
  if (notification.update.sessionUpdate === 'live_voice_interaction_ended') {
    publishLiveVoiceInteractionEnded({
      sessionId: notification.sessionId,
      update: notification.update,
    });
    return Promise.resolve();
  }

  acpChatSessionActions.applyAcpSauronSessionNotification(notification);
  return Promise.resolve();
}

export function handleAcpProviderDeviceCodeNotification(
  notification: ProviderDeviceCodeNotification_unstable
): Promise<void> {
  window.dispatchEvent(new CustomEvent('sauron:device-code', { detail: notification }));
  return Promise.resolve();
}
