import { api } from './client';

/** 웹 ContactModal과 동일한 엔드포인트 — 서버가 세션에서 이메일을 채운다 */
export async function submitInquiry(subject: string, message: string): Promise<void> {
  await api.post('/inquiries', { subject, message });
}

/** 서버 검증값(InquiryRequest)과 동기화 유지 */
export const INQUIRY_LIMITS = { subject: 200, message: 3000 } as const;
