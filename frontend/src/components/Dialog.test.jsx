// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import Dialog from './Dialog'

expect.extend(matchers)

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
    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)
    fireEvent.mouseDown(screen.getByText('내용'))
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it('closeOnBackdrop=false면 배경 클릭을 무시한다', () => {
    const onClose = vi.fn()
    render(<Dialog onClose={onClose} title="t" closeOnBackdrop={false}><p>내용</p></Dialog>)
    const dialog = screen.getByRole('dialog')
    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
  })
  it('언마운트 시 dialog가 문서에 붙어 있는 동안 close된다(포커스 복귀 조건)', () => {
    let connectedAtClose = null
    const spy = vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function () {
      connectedAtClose = this.isConnected
      this.removeAttribute('open')
    })
    render(<Dialog onClose={() => {}} title="t"><p>내용</p></Dialog>).unmount()
    expect(connectedAtClose).toBe(true)
    spy.mockRestore()
  })
  it('중첩 dialog에서 안쪽 Esc(cancel)는 바깥 onClose를 호출하지 않는다', () => {
    const outerClose = vi.fn()
    const innerClose = vi.fn()
    render(
      <Dialog onClose={outerClose} title="바깥">
        <p>바깥 내용</p>
        <Dialog onClose={innerClose} title="안쪽"><p>안쪽 내용</p></Dialog>
      </Dialog>,
    )
    const inner = screen.getByRole('dialog', { name: '안쪽' })
    fireEvent(inner, new Event('cancel', { cancelable: true }))
    expect(innerClose).toHaveBeenCalledTimes(1)
    expect(outerClose).not.toHaveBeenCalled()
  })
  it('axe 위반이 없다', async () => {
    const { baseElement } = render(<Dialog onClose={() => {}} title="t"><label htmlFor="x">이름</label><input id="x" /></Dialog>)
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
