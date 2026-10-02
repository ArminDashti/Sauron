import notificationChime from '../assets/notification-chime.wav';

let chime: HTMLAudioElement | null = null;

/**
 * Plays the notification chime unless the user disabled notification sounds
 * in Settings. Never throws so callers can fire it alongside a notification.
 */
export async function playNotificationSound(): Promise<void> {
  try {
    const enabled = await window.electron.getSetting('notificationSoundEnabled');
    if (enabled !== true) {
      return;
    }
    if (!chime) {
      chime = new window.Audio(notificationChime);
    }
    chime.currentTime = 0;
    await chime.play();
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}
