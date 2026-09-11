/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import AddTaskModal from './AddTaskModal'
import EditTaskModal from './EditTaskModal'
import StickerPicker from './StickerPicker'
import SubtaskProposalModal from './SubtaskProposalModal'
import TaskBoardModal from './TaskBoardModal'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  dispatchAiUsed: vi.fn(),
}))

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: mocks }
})

vi.mock('../hooks/useAiUsage', () => ({
  default: () => ({
    usage: { used: 10, remaining: 90, limit: 100 },
    loading: false,
    hasEnough: () => true,
  }),
  dispatchAiUsed: mocks.dispatchAiUsed,
}))

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

beforeEach(() => {
  mocks.get.mockReset()
  mocks.post.mockReset().mockResolvedValue({ data: {} })
  mocks.patch.mockReset().mockResolvedValue({ data: {} })
  mocks.delete.mockReset().mockResolvedValue({ data: {} })
  mocks.dispatchAiUsed.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('할 일 모달', () => {
  it('추가 모달이 refined 표면·입력·선택 상태를 사용하고 기존 payload를 보존한다', async () => {
    const onClose = vi.fn()
    render(<AddTaskModal onClose={onClose} onCreated={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: '일정 추가' })
    expect(dialog.firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(screen.getByRole('textbox', { name: '할 일 *' })).toHaveClass('input-refined')
    expect(screen.getByRole('textbox', { name: '메모 (선택)' })).toHaveClass('input-refined')

    const aiMode = screen.getByRole('button', { name: 'AI가 알아서' })
    const todayMode = screen.getByRole('button', { name: '오늘까지' })
    expect(aiMode).toHaveClass('btn-refined', 'btn-refined-selected')
    expect(aiMode).toHaveAttribute('aria-pressed', 'true')
    expect(todayMode).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(todayMode)
    expect(todayMode).toHaveAttribute('aria-pressed', 'true')

    expect(screen.getByRole('checkbox', { name: '시작 시간 입력' }).closest('label')).toHaveClass('min-h-[max(44px,2.75rem)]')
    fireEvent.change(screen.getByRole('textbox', { name: '할 일 *' }), { target: { value: '자료 정리' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
      title: '자료 정리',
      noDeadline: false,
      startTime: null,
      estimatedMinutes: null,
    })))
    expect(mocks.post.mock.calls[0][1].deadline).toMatch(/T23:59$/)

    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('수정 모달의 날짜·시간 필드 이름과 저장·삭제 조작 위계를 유지한다', () => {
    const task = {
      taskId: 3,
      title: '수정할 일',
      description: '',
      deadline: '2026-12-31T18:00:00',
      startTime: '2026-12-31T17:00:00',
      estimatedMinutes: 60,
      category: 'WORK',
      aiPriorityScore: 0.5,
      userPriorityScore: null,
      isLocked: true,
    }
    render(<EditTaskModal task={task} onClose={vi.fn()} onUpdated={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: '일정 수정' })
    expect(dialog.firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(screen.getByLabelText('마감 시간')).toHaveClass('input-refined')
    expect(screen.getByLabelText('시작 시간 (선택)')).toHaveClass('input-refined')
    expect(screen.getByLabelText('예상 시간 (선택)')).toHaveClass('input-refined')
    expect(screen.getByRole('button', { name: '삭제' })).toHaveClass('btn-refined', 'btn-refined-danger')
    expect(screen.getByRole('button', { name: '저장' })).toHaveClass('btn-refined', 'btn-refined-primary')
  })

  it('크게 보기의 정렬 선택·완료·편집 조작이 refined 계약을 따른다', () => {
    const task = { taskId: 9, title: '보드 할 일', status: 'TODO', category: 'WORK', deadline: null }
    const onToggleTask = vi.fn()
    const onEditTask = vi.fn()
    const sections = { today: [task] }
    const view = render(<TaskBoardModal sections={sections} onClose={vi.fn()} onEditTask={onEditTask} onToggleTask={onToggleTask} />)

    const priority = screen.getByRole('button', { name: '중요도순' })
    expect(priority).toHaveClass('btn-refined', 'btn-refined-selected')
    expect(priority).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '마감순' })).toHaveAttribute('aria-pressed', 'false')

    const complete = screen.getByRole('button', { name: '완료' })
    expect(complete).toHaveClass('btn-refined')
    expect(complete).toHaveAttribute('aria-pressed', 'false')
    expect(complete.firstElementChild).toHaveClass('h-5', 'w-5', 'border-edge')
    fireEvent.click(complete)
    expect(onToggleTask).toHaveBeenCalledWith(task)

    const edit = screen.getByRole('button', { name: /보드 할 일/ })
    expect(edit).toHaveClass('btn-refined')
    fireEvent.click(edit)
    expect(onEditTask).toHaveBeenCalledWith(task)

    view.rerender(
      <TaskBoardModal
        sections={{ recentDone: [{ ...task, status: 'DONE' }] }}
        onClose={vi.fn()}
        onEditTask={onEditTask}
        onToggleTask={onToggleTask}
      />,
    )
    const doneButton = screen.getByRole('button', { name: '완료 취소' })
    expect(doneButton).toHaveAttribute('aria-pressed', 'true')
    expect(doneButton.firstElementChild).toHaveClass('h-5', 'w-5', 'bg-primary', 'text-on-accent')
  })

  it('서브태스크 제안의 체크 본체는 작게 유지하고 라벨로 44px 조작 영역을 제공한다', async () => {
    mocks.post.mockResolvedValueOnce({
      data: { subtasks: [{ title: '자료 찾기', description: '', estimatedMinutes: 20 }] },
    })
    render(<SubtaskProposalModal task={{ taskId: 3, title: '수정할 일' }} onClose={vi.fn()} onCreated={vi.fn()} />)

    const include = await screen.findByRole('checkbox', { name: '하위 태스크 포함' })
    expect(include).toHaveClass('h-4', 'w-4')
    expect(include.closest('label')).toHaveClass('min-h-[max(44px,2.75rem)]', 'min-w-[max(44px,2.75rem)]')
    expect(screen.getByRole('dialog', { name: '태스크 쪼개기' }).firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(screen.getByRole('textbox', { name: '서브태스크 제목' })).toHaveClass('input-refined')
    expect(screen.getByRole('button', { name: '선택한 항목 저장' })).toHaveClass('btn-refined', 'btn-refined-primary')
  })
})

describe('StickerPicker', () => {
  it('스프라이트 크기는 유지하고 트리거·선택지 조작 영역만 확대한다', async () => {
    mocks.get.mockResolvedValue({
      data: { items: [{ type: 'STICKER', owned: true, code: 'sticker.star' }] },
    })
    render(
      <MemoryRouter>
        <StickerPicker current={null} onSelect={vi.fn()} />
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', { name: '스티커 붙이기' })
    expect(trigger).toHaveClass('btn-refined')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/shop/catalog'))
    const sticker = await screen.findByRole('button', { name: '별' })
    expect(sticker).toHaveClass('btn-refined')
    expect(sticker).toHaveAttribute('aria-pressed', 'false')
    expect(within(sticker).getByRole('img')).toHaveClass('h-6', 'w-6')
    expect(sticker.parentElement).toHaveClass('gap-1.5')
  })
})
