import os from 'node:os';
import { ipcMain } from 'electron';
import type { UserProfile } from './userProfile';

export const resolveUserProfile = (): UserProfile => {
  try {
    return { username: os.userInfo().username.trim() };
  } catch {
    return { username: '' };
  }
};

ipcMain.handle('get-user-profile', async (): Promise<UserProfile> => resolveUserProfile());
