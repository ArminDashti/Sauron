import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePinnedSessions } from './usePinnedSessions';

const KEY = 'sessions_pinned';

const read = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');

describe('usePinnedSessions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with nothing pinned', () => {
    const { result } = renderHook(() => usePinnedSessions());

    expect(result.current.pinnedSessionIds).toEqual([]);
    expect(result.current.isPinned('s1')).toBe(false);
  });

  it('pins to the front so the newest pin leads the section', () => {
    const { result } = renderHook(() => usePinnedSessions());

    act(() => result.current.togglePin('s1'));
    act(() => result.current.togglePin('s2'));

    expect(result.current.pinnedSessionIds).toEqual(['s2', 's1']);
    expect(read()).toEqual(['s2', 's1']);
  });

  it('unpins a session that is already pinned', () => {
    const { result } = renderHook(() => usePinnedSessions());

    act(() => result.current.togglePin('s1'));
    act(() => result.current.togglePin('s1'));

    expect(result.current.pinnedSessionIds).toEqual([]);
    expect(read()).toEqual([]);
  });

  it('drops pins for deleted sessions', () => {
    const { result } = renderHook(() => usePinnedSessions());

    act(() => result.current.togglePin('s1'));
    act(() => result.current.togglePin('s2'));
    act(() => result.current.forgetSessions(['s1']));

    expect(result.current.pinnedSessionIds).toEqual(['s2']);
    expect(read()).toEqual(['s2']);
  });

  it('reloads pins written by another window', () => {
    const { result } = renderHook(() => usePinnedSessions());

    act(() => {
      localStorage.setItem(KEY, JSON.stringify(['remote']));
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    });

    expect(result.current.isPinned('remote')).toBe(true);
  });

  it('ignores a corrupt stored value instead of throwing', () => {
    localStorage.setItem(KEY, 'not-json');

    const { result } = renderHook(() => usePinnedSessions());

    expect(result.current.pinnedSessionIds).toEqual([]);
  });

  it('ignores stored entries that are not session ids', () => {
    localStorage.setItem(KEY, JSON.stringify(['s1', 42, null]));

    const { result } = renderHook(() => usePinnedSessions());

    expect(result.current.pinnedSessionIds).toEqual(['s1']);
  });
});
