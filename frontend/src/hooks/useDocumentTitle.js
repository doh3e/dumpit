import { useEffect } from 'react'

const DEFAULT = '덤핏(Dumpit!)'
const ROUTE_NAMES = {
  '/dashboard': '대시보드', '/brain-dump': '브레인 덤프', '/ideas': '아이디어 덤프',
  '/routines': '루틴', '/shop': '코인샵', '/mypage': '마이페이지',
  '/notices': '공지사항', '/admin': '관리자',
  '/privacy': '개인정보 처리방침', '/terms': '서비스 이용약관', '/account-deletion': '계정 삭제',
}

export function titleFor(pathname) {
  const name = ROUTE_NAMES[pathname]
  return name ? `${name} | 덤핏` : DEFAULT
}

export default function useDocumentTitle(title) {
  useEffect(() => { document.title = title }, [title])
}
