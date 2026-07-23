import { api } from './client';

type CatalogItem = { code: string; type: string; owned: boolean };

/** 보유 스티커 코드 목록 (웹 StickerPicker와 동일 필터) */
export async function fetchOwnedStickers(): Promise<string[]> {
  const res = await api.get('/shop/catalog');
  const items: CatalogItem[] = res.data?.items ?? [];
  return items.filter((i) => i.type === 'STICKER' && i.owned).map((i) => i.code);
}
