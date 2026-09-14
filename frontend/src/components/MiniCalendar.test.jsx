/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MiniCalendar from './MiniCalendar'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    API_BASE_URL: 'https://api.test/api',
    default: { get: mocks.get, post: mocks.post },
  }
})

function localDateTime(day, hour = 9) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), day, hour, 0, 0).toISOString()
}

describe('MiniCalendar', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockResolvedValue({ data: [] })
    mocks.post.mockReset().mockResolvedValue({ data: {} })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('월 이동은 44px refined 조작으로 제공하고 7열 날짜 셀은 밀집 구조를 유지한다', async () => {
    const now = new Date()
    render(<MiniCalendar />)
    await waitFor(() => expect(mocks.get).toHaveBeenCalled())

    const previous = screen.getByRole('button', { name: '이전 달' })
    const next = screen.getByRole('button', { name: '다음 달' })
    expect(previous).toHaveClass('btn-refined')
    expect(next).toHaveClass('btn-refined')

    fireEvent.click(previous)
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    expect(screen.getByText(`${previousDate.getFullYear()}년 ${previousDate.getMonth() + 1}월`)).toBeInTheDocument()
    fireEvent.click(next)
    expect(screen.getByText(`${now.getFullYear()}년 ${now.getMonth() + 1}월`)).toBeInTheDocument()

    const day = screen.getByRole('button', { name: new RegExp(`^${now.getMonth() + 1}월 1일`) })
    expect(day).not.toHaveClass('btn-refined')
    expect(day.parentElement?.parentElement).toHaveClass('grid-cols-7')
  })

  it('날짜 팝오버를 refined 표면으로 고정하고 44px 닫기로 다시 닫는다', async () => {
    const month = new Date().getMonth() + 1
    const task = { taskId: 1, title: '달력 할 일', deadline: localDateTime(15) }
    render(<MiniCalendar tasks={[task]} />)
    await waitFor(() => expect(mocks.get).toHaveBeenCalled())

    const day = screen.getByRole('button', { name: `${month}월 15일, 할 일 1개` })
    fireEvent.click(day)
    const close = screen.getByRole('button', { name: '닫기' })
    expect(close).toHaveClass('btn-refined')
    expect(screen.getByText('달력 할 일').closest('.surface-refined')).toBeInTheDocument()

    fireEvent.click(close)
    expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument()
  })

  it('Google 일정 추가 버튼과 기존 잠금 payload를 보존한다', async () => {
    const event = {
      id: 'g-1',
      summary: '회의',
      memo: '주간 회의',
      start: localDateTime(16, 10),
      end: localDateTime(16, 11),
    }
    const onTaskAdded = vi.fn()
    mocks.get.mockResolvedValue({ data: [event] })
    render(<MiniCalendar onTaskAdded={onTaskAdded} />)

    const day = await screen.findByRole('button', { name: new RegExp('16일, 일정 1개') })
    fireEvent.click(day)
    const add = screen.getByRole('button', { name: '+ 추가' })
    expect(add).toHaveClass('btn-refined')
    fireEvent.click(add)

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/tasks', {
      title: '회의',
      description: '주간 회의',
      deadline: event.end,
      estimatedMinutes: 60,
      startTime: event.start,
      endTime: event.end,
      isLocked: true,
    }))
    expect(onTaskAdded).toHaveBeenCalledTimes(1)
  })

  it('Google Calendar 권한 안내를 토큰 대비와 refined 권한 버튼으로 표시한다', async () => {
    mocks.get.mockRejectedValue({ response: { data: { code: 'CALENDAR_PERMISSION_REQUIRED' } } })
    render(<MiniCalendar />)

    const message = await screen.findByText('Google Calendar 일정을 보려면 캘린더 읽기 권한이 필요해요.')
    expect(message).toHaveClass('text-dark')
    expect(screen.getByRole('button', { name: '권한 허용하기' })).toHaveClass('btn-refined')
  })
})
