import { api } from './client';
import type { CatalogResponse } from './types';

export async function fetchCatalog(): Promise<CatalogResponse> {
  const res = await api.get('/shop/catalog');
  return res.data;
}

/** THEME는 구매 시 서버가 자동 장착 */
export async function purchaseItem(code: string): Promise<{ message: string; remainingCoins: number; equipped: boolean }> {
  const res = await api.post('/shop/purchase', { code });
  return res.data;
}

export async function equipItem(code: string): Promise<void> {
  await api.put('/shop/equip', { code });
}

export async function unequipSlot(slot: string): Promise<void> {
  await api.delete(`/shop/equip/${slot}`);
}

/** 보유 스티커 코드 목록 (웹 StickerPicker와 동일 필터) */
export async function fetchOwnedStickers(): Promise<string[]> {
  const { items } = await fetchCatalog();
  return items.filter((i) => i.type === 'STICKER' && i.owned).map((i) => i.code);
}
