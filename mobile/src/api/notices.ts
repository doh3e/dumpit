import { api } from './client';
import type { NoticePage, NoticeResponse } from './types';

export async function fetchNotices(page: number): Promise<NoticePage> {
  const res = await api.get('/notices', { params: { page } });
  return res.data;
}

/** 미읽음 popup 공지만 (웹 NoticeModal 패리티) */
export async function fetchUnreadNotices(): Promise<NoticeResponse[]> {
  const res = await api.get('/notices/unread');
  return res.data;
}

export async function markNoticeRead(noticeId: string): Promise<void> {
  await api.post(`/notices/${noticeId}/read`);
}
