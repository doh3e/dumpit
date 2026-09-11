// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ContactModal from './ContactModal'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'local@example.test' } }),
}))
vi.mock('../services/api', () => ({
  default: { post: vi.fn() },
  getApiErrorMessage: (_error, fallback) => fallback,
}))

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

describe('ContactModal', () => {
  afterEach(cleanup)

  it('서버 계약과 같은 3000자 한도와 카운터를 표시한다', () => {
    render(<ContactModal onClose={() => {}} />)

    const message = screen.getByLabelText('내용 *')
    expect(message).toHaveAttribute('maxlength', '3000')
    fireEvent.change(message, { target: { value: '문의 내용' } })
    expect(screen.getByText('5 / 3000')).toBeInTheDocument()
  })

  it('refined 폼과 닫기·취소 동작을 유지한다', () => {
    const onClose = vi.fn()
    render(<ContactModal onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '문의하기' })
    expect(dialog.firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(screen.getByLabelText('제목 *')).toHaveClass('input-refined')
    expect(screen.getByRole('button', { name: '문의 보내기' })).toHaveClass('btn-refined', 'btn-refined-primary')

    const close = screen.getByRole('button', { name: '닫기', exact: true })
    expect(close).toHaveClass('btn-refined', 'btn-refined-text')
    fireEvent.click(close)
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
