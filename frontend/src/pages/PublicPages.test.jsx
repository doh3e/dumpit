/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'
import PrivacyPage from './PrivacyPage'
import TermsPage from './TermsPage'
import AccountDeletionPage from './AccountDeletionPage'

vi.mock('../components/StarField', () => ({ default: () => null }))
vi.mock('../components/WithdrawalPendingModal', () => ({ default: () => null }))
vi.mock('../hooks/useDocumentTitle', () => ({
  default: () => {},
  titleFor: (path) => path,
}))

function renderPage(page, initialEntry = '/') {
  return render(<MemoryRouter initialEntries={[initialEntry]}>{page}</MemoryRouter>)
}

describe('공개 페이지', () => {
  afterEach(cleanup)

  it('로그인 화면의 카피와 정책 링크 목적지를 유지한 refined 표면을 제공한다', () => {
    renderPage(<HomePage />)

    expect(screen.getByRole('heading', { name: '생각을 쏟아내면, AI가 정리해드려요' })).toHaveClass('page-refined-heading')
    expect(screen.getByRole('button', { name: /Sign with Google/ })).toHaveClass('btn-refined', 'btn-refined-primary')
    expect(screen.getAllByRole('link', { name: '서비스 이용약관' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ pathname: '/terms' })]),
    )
    expect(screen.getAllByRole('link', { name: /개인정보.*처리방침/ })).toEqual(
      expect.arrayContaining([expect.objectContaining({ pathname: '/privacy' })]),
    )
    expect(screen.getByRole('heading', { name: '대시보드' }).closest('.surface-refined')).toBeInTheDocument()
  })

  it.each([
    { Page: PrivacyPage, path: '/privacy', title: '개인정보처리방침' },
    { Page: TermsPage, path: '/terms', title: '서비스 이용약관' },
    { Page: AccountDeletionPage, path: '/account-deletion', title: '계정 및 데이터 삭제' },
  ])('$title의 제목과 홈 링크를 유지한 refined 정책 표면을 제공한다', ({ Page, path, title }) => {
    renderPage(<Page />, path)

    expect(screen.getByRole('heading', { name: title, level: 1 })).toHaveClass('page-refined-heading')
    expect(screen.getByRole('link', { name: '← 홈으로' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('heading', { name: title }).closest('.surface-refined')).toBeInTheDocument()
  })

  it('계정 삭제 안내의 개인정보처리방침 링크 목적지를 유지한다', () => {
    renderPage(<AccountDeletionPage />, '/account-deletion')
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/privacy')
  })
})
