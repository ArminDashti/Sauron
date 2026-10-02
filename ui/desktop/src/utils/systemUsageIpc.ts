import { ipcMain } from 'electron';
import { getSystemUsage, type SystemUsage } from './systemUsage';

ipcMain.handle('get-system-usage', async (): Promise<SystemUsage> => getSystemUsage());
