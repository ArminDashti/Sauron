import type {
  LiveVoiceAvailabilityResponse_unstable,
  LiveVoiceStartResponse_unstable,
} from '@aaif/sauron-acp-client';
import { getAcpClient } from './acpConnection';

export async function acpGetLiveVoiceAvailability(
  sessionId?: string
): Promise<LiveVoiceAvailabilityResponse_unstable> {
  const { sauron } = await getAcpClient();
  const useLegacyAgentLoop = await window.electron.getSetting('useLegacyAgentLoop');
  return sauron.sessionLiveVoiceAvailability_unstable({
    ...(sessionId ? { sessionId } : {}),
    _meta: { sauron: { unrolledAgentLoop: !useLegacyAgentLoop } },
  });
}

export async function acpStartLiveVoice(
  sessionId: string,
  offerSdp: string
): Promise<LiveVoiceStartResponse_unstable> {
  const { sauron } = await getAcpClient();
  const useLegacyAgentLoop = await window.electron.getSetting('useLegacyAgentLoop');
  return sauron.sessionLiveVoiceStart_unstable({
    sessionId,
    offerSdp,
    _meta: { sauron: { unrolledAgentLoop: !useLegacyAgentLoop } },
  });
}

export async function acpStopLiveVoice(sessionId: string, interactionId: string): Promise<void> {
  const { sauron } = await getAcpClient();
  await sauron.sessionLiveVoiceStop_unstable({ sessionId, interactionId });
}
