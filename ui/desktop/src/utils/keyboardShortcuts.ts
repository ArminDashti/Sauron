function isMac(): boolean {
  return window.electron?.platform === 'darwin';
}

/**
 * Localised "find" shortcut label used by the search-driven list views.
 * Returns the platform-appropriate key binding.
 */
export function getSearchShortcutText(): string {
  return isMac() ? '⌘F' : 'Ctrl+F';
}
