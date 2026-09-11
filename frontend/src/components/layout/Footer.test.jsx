/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from './Footer'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'local@example.test' } }),
}))
vi.mock('../../services/api', () => ({
  default: { post: vi.fn() },
  getApiErrorMessage: (_error, fallback) => fallback,
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.returnFocus = document.activeElement
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
    this.returnFocus?.focus()
  }
})

describe('Footer', () => {
  afterEach(cleanup)

  it('lg 미만에서 뽀모도로 FAB를 피하는 하단 안전여백을 둔다', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>)

    expect(screen.getByRole('contentinfo').firstElementChild).toHaveClass('pb-28', 'lg:pb-4')
  })

  it('문의 모달에 초기 초점을 보내고 취소하면 트리거로 돌려보낸다', () => {
    render(<MemoryRouter><Footer /></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: '문의하기' })
    trigger.focus()

    fireEvent.click(trigger)

    expect(screen.getByRole('dialog', { name: '문의하기' })).toBeInTheDocument()
    expect(screen.getByLabelText('제목 *')).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog', { name: '문의하기' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
