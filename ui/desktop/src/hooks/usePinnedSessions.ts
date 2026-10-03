import { useCallback, useEffect, useState } from 'react';

const PINNED_SESSIONS_KEY = 'sessions_pinned';

/**
 * Pinned chat sessions, newest pin first.
 *
 * Deliberately client-side: pins are a per-device reading aid, not shared
 * session data, so they stay out of the session store and the ACP surface.
 */
function readPinnedSessionIds(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_SESSIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function writePinnedSessionIds(pinnedSessionIds: string[]): void {
  localStorage.setItem(PINNED_SESSIONS_KEY, JSON.stringify(pinnedSessionIds));
}

export function usePinnedSessions() {
  const [pinnedSessionIds, setPinnedSessionIds] = useState<string[]>(readPinnedSessionIds);

  // Electron windows share an origin, so a pin made in one window has to reach
  // the others; `storage` only fires in the windows that did not write it.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PINNED_SESSIONS_KEY) {
        setPinnedSessionIds(readPinnedSessionIds());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isPinned = useCallback(
    (sessionId: string) => pinnedSessionIds.includes(sessionId),
    [pinnedSessionIds]
  );

  const togglePin = useCallback((sessionId: string) => {
    setPinnedSessionIds((prev) => {
      const next = prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [sessionId, ...prev];
      writePinnedSessionIds(next);
      return next;
    });
  }, []);

  /**
   * Drops pins that no longer name a session. Callers pass the set of sessions
   * they know are gone (a deleted session), never the visible list — pinning must
   * outlive a session falling out of the recent-sessions page.
   */
  const forgetSessions = useCallback((sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    const removed = new Set(sessionIds);
    setPinnedSessionIds((prev) => {
      const next = prev.filter((id) => !removed.has(id));
      if (next.length === prev.length) return prev;
      writePinnedSessionIds(next);
      return next;
    });
  }, []);

  return { pinnedSessionIds, isPinned, togglePin, forgetSessions };
}
