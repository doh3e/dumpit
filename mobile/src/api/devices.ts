import { api } from './client';

export async function registerDevice(token: string): Promise<void> {
  await api.post('/me/devices', { token, platform: 'android' });
}

export async function unregisterDevice(token: string): Promise<void> {
  await api.delete(`/me/devices/${encodeURIComponent(token)}`);
}
