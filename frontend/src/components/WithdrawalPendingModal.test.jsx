// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import WithdrawalPendingModal from './WithdrawalPendingModal'

vi.mock('../services/api', () => ({ API_BASE_URL: 'https://api.test/api' }))

function renderAt(url) {
  window.history.replaceState({}, '', url)
  return render(<WithdrawalPendingModal />)
}

describe('WithdrawalPendingModal', () => {
  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
  })

  it('error=withdrawal_pending이면 복구 확인 모달을 띄운다', () => {
    renderAt('/?error=withdrawal_pending')

    expect(screen.getByText('탈퇴처리가 진행중인 계정입니다')).toBeDefined()
    expect(screen.getByText(/복구하시겠습니까/)).toBeDefined()
    // 복구는 새 OAuth 진입이 곧 동의 — restore=1이 실려야 서버가 복구 의사로 인정한다
    expect(screen.getByRole('link', { name: '복구하기' }).getAttribute('href')).toBe(
      'https://api.test/api/oauth2/authorization/google?restore=1'
    )
  })

  it('다른 로그인 오류에는 뜨지 않는다', () => {
    renderAt('/?error=login_failed')

    expect(screen.queryByText('탈퇴처리가 진행중인 계정입니다')).toBeNull()
  })

  it('아니요를 누르면 닫히고 주소에서 오류 플래그를 지운다', () => {
    renderAt('/?error=withdrawal_pending')

    fireEvent.click(screen.getByRole('button', { name: '아니요' }))

    expect(screen.queryByText('탈퇴처리가 진행중인 계정입니다')).toBeNull()
    expect(window.location.search).toBe('')
  })
})
