export interface UserProfile {
  /** Raw local account name, e.g. `armin`. Empty when the OS user cannot be read. */
  username: string;
}

/** Turns an account name such as `armin.dashti` into a display name. */
export const formatUserName = (username: string): string =>
  username
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/** Initials for the avatar, e.g. `Armin Dashti` -> `AD`. */
export const getUserInitials = (displayName: string): string =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
