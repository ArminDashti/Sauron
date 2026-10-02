import {
  AppWindow,
  Clock,
  FileText,
  History,
  LayoutGrid,
  MessageSquarePlus,
  Puzzle,
  Settings,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl';
import type { IconColorKey } from '../theme/iconColors';

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  /** Palette key used to tint the icon so each destination is recognizable by color. */
  color: IconColorKey;
  getTag?: () => string;
  tagAlign?: 'left' | 'right';
}

/** Top-level nav items (excluding Settings which is pinned to the bottom). */
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', path: '/', label: 'New Chat', icon: MessageSquarePlus, color: 'newChat' },
  { id: 'hub', path: '/hub', label: 'Hub', icon: LayoutGrid, color: 'hub' },
  { id: 'scheduler', path: '/schedules', label: 'Scheduler', icon: Clock, color: 'scheduler' },
];

/**
 * Nav items removed from the sidebar; they are surfaced as tabs inside the
 * Settings view instead.
 */
export const SETTINGS_NAV_ITEMS: NavItem[] = [
  { id: 'recipes', path: '/recipes', label: 'Recipes', icon: FileText, color: 'recipes' },
  { id: 'skills', path: '/skills', label: 'Skills', icon: Zap, color: 'skills' },
  { id: 'apps', path: '/apps', label: 'Apps', icon: AppWindow, color: 'apps' },
  { id: 'extensions', path: '/extensions', label: 'Extensions', icon: Puzzle, color: 'extensions' },
  { id: 'sessions', path: '/sessions', label: 'Session History', icon: History, color: 'sessions' },
];

/** Settings is rendered separately, pinned to the bottom of the sidebar. */
export const SETTINGS_NAV_ITEM: NavItem = {
  id: 'settings',
  path: '/settings',
  label: 'Settings',
  icon: Settings,
  color: 'settings',
};

// Translation descriptors for nav labels. Kept here next to NAV_ITEMS so the two
// stay in sync.
const navItemMessages = defineMessages({
  home: {
    id: 'navigation.itemHome',
    defaultMessage: 'New Chat',
  },
  hub: {
    id: 'navigation.itemHub',
    defaultMessage: 'Hub',
  },
  recipes: {
    id: 'navigation.itemRecipes',
    defaultMessage: 'Recipes',
  },
  skills: {
    id: 'navigation.itemSkills',
    defaultMessage: 'Skills',
  },
  apps: {
    id: 'navigation.itemApps',
    defaultMessage: 'Apps',
  },
  scheduler: {
    id: 'navigation.itemScheduler',
    defaultMessage: 'Scheduler',
  },
  extensions: {
    id: 'navigation.itemExtensions',
    defaultMessage: 'Extensions',
  },
  sessions: {
    id: 'navigation.itemSessions',
    defaultMessage: 'Session History',
  },
  settings: {
    id: 'navigation.itemSettings',
    defaultMessage: 'Settings',
  },
});

const NAV_ITEM_MESSAGES: Record<string, MessageDescriptor> = navItemMessages;

/** Format a NavItem's label using the provided intl instance, falling back to `item.label`. */
export function getNavItemLabel(item: NavItem, intl: IntlShape): string {
  const descriptor = NAV_ITEM_MESSAGES[item.id];
  return descriptor ? intl.formatMessage(descriptor) : item.label;
}
