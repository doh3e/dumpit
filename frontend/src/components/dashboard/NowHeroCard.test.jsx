/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NowHeroCard from './NowHeroCard'

vi.mock('../OrbitProgress', () => ({
  default: ({ done, total }) => (
    <output data-testid="orbit-progress" data-done={done} data-total={total}>
      {done} / {total}
    </output>
  ),
}))

afterEach(cleanup)

describe('NowHeroCard', () => {
  it('지금 할 일과 다음 할 일을 보여주고 완료·수정 동작 및 진행률을 유지한다', () => {
    const task = { taskId: 1, title: '발표 초안', deadline: null }
    const next = { taskId: 2, title: '빨래 널기', deadline: null }
    const onEdit = vi.fn()
    const onComplete = vi.fn()

    render(
      <NowHeroCard
        nowSuggestion={{ task, message: '먼저 이 일을 해보세요.' }}
        queue={[{ bucket: 'TODAY', task: next }]}
        todayDone={1}
        todayTotal={3}
        allDone={false}
        onEdit={onEdit}
        onComplete={onComplete}
      />,
    )

    expect(screen.getByText('지금 할 일')).toBeInTheDocument()
    expect(screen.getByText('다음에 할 일')).toBeInTheDocument()
    expect(screen.getByText('먼저 이 일을 해보세요.')).toBeInTheDocument()
    expect(screen.getByTestId('orbit-progress')).toHaveAttribute('data-done', '1')
    expect(screen.getByTestId('orbit-progress')).toHaveAttribute('data-total', '3')

    fireEvent.click(screen.getByRole('button', { name: '완료하기' }))
    expect(onComplete.mock.calls[0][0]).toBe(task)
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    expect(onEdit).toHaveBeenCalledWith(task)
    fireEvent.click(screen.getByRole('button', { name: /빨래 널기/ }))
    expect(onEdit).toHaveBeenCalledWith(next)
  })

  it('오늘 할 일을 다 비운 일과시간에는 보너스 큐를 미리 보여준다', () => {
    const next = { taskId: 3, title: '내일 준비', deadline: null }
    const onEdit = vi.fn()

    render(
      <NowHeroCard
        nowSuggestion={{ type: 'ACTIVE' }}
        queue={[{ bucket: 'TOMORROW', task: next }]}
        todayDone={3}
        todayTotal={3}
        allDone
        onEdit={onEdit}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText('오늘 다 비웠어요')).toBeInTheDocument()
    expect(screen.getByText('미리 해볼 일')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /내일 준비/ }))
    expect(onEdit).toHaveBeenCalledWith(next)
  })

  it('오늘 할 일을 다 비운 취침 시간에는 보너스 큐를 숨긴다', () => {
    render(
      <NowHeroCard
        nowSuggestion={{ type: 'SLEEP' }}
        queue={[{ bucket: 'TOMORROW', task: { taskId: 4, title: '내일 일', deadline: null } }]}
        todayDone={2}
        todayTotal={2}
        allDone
        onEdit={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText('머릿속이 가벼워졌네요. 내일 또 만나요.')).toBeInTheDocument()
    expect(screen.queryByText('미리 해볼 일')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /내일 일/ })).not.toBeInTheDocument()
  })

  it('SLEEP 제안의 제목과 메시지를 보여준다', () => {
    render(
      <NowHeroCard
        nowSuggestion={{ type: 'SLEEP', title: '지금은 쉬어가요.', message: '내일 다시 시작해요.' }}
        todayDone={0}
        todayTotal={2}
        allDone={false}
        onEdit={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText('지금은 쉬어가요.')).toBeInTheDocument()
    expect(screen.getByText('내일 다시 시작해요.')).toBeInTheDocument()
  })

  it('제안이 없을 때 기본 빈 시간 안내를 보여준다', () => {
    render(
      <NowHeroCard
        nowSuggestion={null}
        todayDone={0}
        todayTotal={0}
        allDone={false}
        onEdit={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText('지금은 비어 있는 시간이에요.')).toBeInTheDocument()
    expect(screen.getByText('가벼운 일부터 하나 시작해볼까요?')).toBeInTheDocument()
  })
})
