// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider, notifyToast } from './ToastContext'

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { cleanup(); vi.useRealTimers() })

  it('오류는 alert로 고정되고 닫기 버튼으로만 사라진다', () => {
    render(<ToastProvider><div /></ToastProvider>)
    act(() => notifyToast('상태 변경에 실패했어요.', 'error'))
    expect(screen.getByRole('alert')).toHaveTextContent('상태 변경에 실패했어요.')
    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
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
})
