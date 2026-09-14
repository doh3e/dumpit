/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RoutinePage from './RoutinePage'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: mocks }
})

const routine = {
  routineId: 7,
  name: '아침 스트레칭',
  description: '천천히',
  enabled: true,
  repeatType: 'WEEKLY',
  daysOfWeek: [1],
  daysOfMonth: [],
  monthlyWeekOrdinal: 1,
  monthlyWeekDay: 1,
  runOnLastDayIfMissing: false,
  routineStartTime: '06:30:00',
  routineEndTime: '07:00:00',
  startDate: '2026-09-12',
  endDate: null,
}

describe('RoutinePage', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockResolvedValue({ data: [routine] })
    mocks.post.mockReset().mockResolvedValue({ data: {} })
    mocks.patch.mockReset().mockResolvedValue({ data: {} })
    mocks.delete.mockReset().mockResolvedValue({ data: {} })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('루틴 편집·활성 토글·삭제 취소 정책을 유지한다', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<RoutinePage />)

    const edit = await screen.findByRole('button', { name: /아침 스트레칭/ })
    expect(edit).toHaveClass('btn-refined')
    fireEvent.click(edit)
    expect(screen.getByRole('textbox', { name: '루틴명 *' })).toHaveValue('아침 스트레칭')

    const toggle = screen.getByRole('button', { name: '끄기' })
    expect(toggle).toHaveClass('btn-refined')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/routines/7/enabled', { enabled: false }))

    const remove = screen.getByRole('button', { name: '삭제' })
    expect(remove).toHaveClass('btn-refined', 'btn-refined-danger')
    fireEvent.click(remove)
    expect(confirmSpy).toHaveBeenCalledWith('이 루틴을 삭제할까요? 이미 생성된 태스크는 남아 있어요.')
    expect(mocks.delete).not.toHaveBeenCalled()
  })

  it('반복·시간·시작/종료일 payload를 보존하고 선택 상태와 44px 조작 영역을 노출한다', async () => {
    mocks.get.mockResolvedValue({ data: [] })
    render(<RoutinePage />)
    await screen.findByText('아직 루틴이 없어요')

    expect(screen.getByRole('heading', { level: 1, name: '루틴' })).toHaveClass('page-refined-heading')
    expect(screen.getByRole('textbox', { name: '루틴명 *' })).toHaveClass('input-refined')
    expect(screen.getByRole('textbox', { name: '메모' })).toHaveClass('input-refined')
    expect(screen.getByRole('checkbox', { name: '루틴 켜기' }).closest('label')).toHaveClass('min-h-[max(44px,2.75rem)]')

    const weekly = screen.getByRole('button', { name: '요일', exact: true })
    expect(weekly).toHaveClass('btn-refined')
    expect(weekly).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(weekly)
    expect(weekly).toHaveAttribute('aria-pressed', 'true')

    const monday = screen.getByRole('button', { name: '월', exact: true })
    expect(monday).toHaveClass('btn-refined')
    expect(monday).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(monday)
    expect(monday).toHaveAttribute('aria-pressed', 'true')

    fireEvent.change(screen.getByRole('textbox', { name: '루틴명 *' }), { target: { value: '주간 정리' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '시작 시간 지정' }))
    fireEvent.change(screen.getByLabelText('시작 시간', { selector: 'input' }), { target: { value: '08:00' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '종료 시간도 지정' }))
    fireEvent.change(screen.getByLabelText('종료 시간', { selector: 'input' }), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-09-15' } })
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-10-15' } })
    fireEvent.click(screen.getByRole('button', { name: '추가', exact: true }))

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/routines', expect.objectContaining({
      name: '주간 정리',
      repeatType: 'WEEKLY',
      daysOfWeek: [1],
      createTime: '08:00',
      routineStartTime: '08:00',
      routineEndTime: '09:00',
      startDate: '2026-09-15',
      endDate: '2026-10-15',
    })))
  })

  it('7열 월간 날짜는 밀집 예외를 유지하고 5열 주차는 일반 조작 크기를 적용한다', async () => {
    mocks.get.mockResolvedValue({ data: [] })
    render(<RoutinePage />)
    await screen.findByText('아직 루틴이 없어요')

    fireEvent.click(screen.getByRole('button', { name: '날짜', exact: true }))
    const firstDay = screen.getByRole('button', { name: '1', exact: true })
    expect(firstDay).not.toHaveClass('btn-refined')
    expect(firstDay).toHaveClass('h-8')
    expect(firstDay).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: '주차', exact: true }))
    const firstWeek = screen.getByRole('button', { name: '첫째', exact: true })
    expect(firstWeek).toHaveClass('btn-refined')
    expect(firstWeek).toHaveAttribute('aria-pressed', 'true')
    expect(firstWeek.parentElement).toHaveClass('flex', 'flex-wrap')
  })
})
