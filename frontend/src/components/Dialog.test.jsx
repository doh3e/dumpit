// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Dialog from './Dialog'

beforeAll(() => {
  // jsdom은 showModal/close를 구현하지 않는다
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
  }
})
afterEach(cleanup)

describe('Dialog', () => {
  it('role=dialog와 접근 가능한 이름을 가진다', () => {
    render(<Dialog onClose={() => {}} title="일정 추가"><p>내용</p></Dialog>)
    expect(screen.getByRole('dialog', { name: '일정 추가' })).toBeTruthy()
  })
  it('Esc(cancel)와 배경 클릭은 onClose, 패널 클릭은 무시', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} title="t"><p>내용</p></Dialog>)
    const dialog = screen.getByRole('dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByText('내용'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it('closeOnBackdrop=false면 배경 클릭을 무시한다', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} title="t" closeOnBackdrop={false}><p>내용</p></Dialog>)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
