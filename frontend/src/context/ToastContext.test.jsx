// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider, notifyToast } from './ToastContext'

beforeAll(() => {
  // jsdom은 Popover API가 없으면서 UA 스타일로 [popover]를 display:none 처리한다 — 표시 여부만 흉내 낸다
  if (!HTMLElement.prototype.showPopover) {
    HTMLElement.prototype.showPopover = function () { this.style.display = 'block' }
    HTMLElement.prototype.hidePopover = function () { this.style.display = 'none' }
  }
})

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('오류는 alert로 고정되고 닫기 버튼으로만 사라진다', () => {
    render(<ToastProvider><div /></ToastProvider>)
    act(() => notifyToast('상태 변경에 실패했어요.', 'error'))
    expect(screen.getByRole('alert')).toHaveTextContent('상태 변경에 실패했어요.')
    expect(screen.getByRole('alert')).toHaveClass('surface-refined')
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole('alert')).toBeTruthy()
    const close = screen.getByRole('button', { name: '닫기' })
    expect(close).toHaveClass('btn-refined', 'btn-refined-text', '!h-11', '!w-11')
    fireEvent.click(close)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('성공은 status로 3.2초 뒤 사라진다', () => {
    render(<ToastProvider><div /></ToastProvider>)
    act(() => notifyToast('저장했어요.', 'success'))
    expect(screen.getByRole('status')).toHaveTextContent('저장했어요.')
    expect(screen.queryByRole('button', { name: '닫기' })).toBeNull()
    act(() => vi.advanceTimersByTime(3200))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('토스트 컨테이너는 popover=manual로 top layer에 올라간다', () => {
    const show = vi.spyOn(HTMLElement.prototype, 'showPopover')
    const hide = vi.spyOn(HTMLElement.prototype, 'hidePopover')
    try {
      render(<ToastProvider><div /></ToastProvider>)
      act(() => notifyToast('저장에 실패했어요.', 'error'))
      const layer = screen.getByRole('alert').parentElement
      expect(layer.getAttribute('popover')).toBe('manual')
      expect(show).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: '닫기' }))
      expect(hide).toHaveBeenCalledTimes(1)
    } finally {
      show.mockRestore()
      hide.mockRestore()
    }
  })
})
