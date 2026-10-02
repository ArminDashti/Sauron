/**
 * Central palette for the app's decorative icons.
 *
 * Icons always sit next to a text label, so they can safely carry meaning
 * through color instead of repeating that label. Keeping the hues in one place
 * means the same concept (skills, extensions, settings, …) uses the same color
 * wherever it is rendered, and makes a future theme-aware pass a single-file
 * change.
 */
export const ICON_COLORS = {
  // Navigation rail
  newChat: '#3b82f6', // blue
  hub: '#6366f1', // indigo
  recipes: '#10b981', // emerald
  skills: '#f59e0b', // amber
  apps: '#14b8a6', // teal
  scheduler: '#f97316', // orange
  extensions: '#ec4899', // pink
  sessions: '#0ea5e9', // sky
  settings: '#8b5cf6', // violet
  feedback: '#f43f5e', // rose

  // Settings tab rail
  models: '#3b82f6', // blue
  providers: '#8b5cf6', // violet
  harnesses: '#06b6d4', // cyan
  localInference: '#14b8a6', // teal
  chat: '#22c55e', // green
  sharing: '#0ea5e9', // sky
  prompts: '#f59e0b', // amber
  keyboard: '#6366f1', // indigo
  auth: '#f43f5e', // rose
  mcp: '#f97316', // orange
  plugins: '#ec4899', // pink
  appearance: '#d946ef', // fuchsia
  app: '#eab308', // yellow
} as const;

export type IconColorKey = keyof typeof ICON_COLORS;

/** Hues cycled by the activity indicator while the agent is thinking or waiting. */
export const ICON_COLOR_CYCLE: readonly string[] = [
  ICON_COLORS.newChat,
  ICON_COLORS.recipes,
  ICON_COLORS.skills,
  ICON_COLORS.apps,
  ICON_COLORS.scheduler,
  ICON_COLORS.extensions,
  ICON_COLORS.sessions,
];

/** Resolve a palette key to a CSS color usable via `style={{ color: … }}`. */
export const iconColor = (key: IconColorKey): string => ICON_COLORS[key];
