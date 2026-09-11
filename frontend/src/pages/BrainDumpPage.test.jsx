/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BrainDumpPage from './BrainDumpPage'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  dispatchAiUsed: vi.fn(),
  announce: vi.fn(),
  aiUsage: null,
}))

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, default: { post: mocks.post } }
})

vi.mock('../hooks/useAiUsage', () => ({
  default: () => mocks.aiUsage,
  dispatchAiUsed: mocks.dispatchAiUsed,
}))

vi.mock('../utils/announce', () => ({
  announce: mocks.announce,
}))

const analysis = {
  dumpId: 77,
  tasks: [
    {
      title: '발표 초안',
      description: null,
      aiPriorityScore: 0.7,
      category: 'WORK',
      deadline: null,
      estimatedMinutes: 90,
    },
    {
      title: '빨래 널기',
      description: null,
      aiPriorityScore: 0.4,
      category: 'CHORE',
      deadline: null,
      estimatedMinutes: 30,
    },
  ],
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/brain-dump']}>
      <Routes>
        <Route path="/brain-dump" element={<BrainDumpPage />} />
        <Route path="/dashboard" element={<p>대시보드 도착</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function enterText(value = '발표 초안과 빨래') {
  fireEvent.change(screen.getByRole('textbox', { name: '브레인 덤프 입력' }), {
    target: { value },
  })
}

async function analyze(response = analysis) {
  mocks.post.mockResolvedValueOnce({ data: response })
  enterText()
  fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
  await screen.findByRole('heading', { name: '정리한 할 일' })
}

describe('BrainDumpPage', () => {
  beforeEach(() => {
    mocks.post.mockReset()
    mocks.dispatchAiUsed.mockReset()
    mocks.announce.mockReset()
    mocks.aiUsage = {
      usage: {
        used: 32,
        remaining: 68,
        limit: 100,
        resetAt: '2026-09-12T00:00:00+09:00',
      },
      loading: false,
      refresh: vi.fn(),
      hasEnough: vi.fn((cost) => cost <= 68),
    }
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('3000자 제한과 비용 안내를 제공하고 빈 입력에서는 분석하지 않는다', () => {
    renderPage()

    const input = screen.getByRole('textbox', { name: '브레인 덤프 입력' })
    const analyzeButton = screen.getByRole('button', { name: 'AI로 정리하기' })
    expect(input).toHaveAttribute('maxlength', '3000')
    expect(input).toHaveClass('input-refined')
    expect(input.closest('section')).toHaveClass('surface-refined')
    expect(analyzeButton).toBeDisabled()
    expect(screen.getByText(/이 작업은 5점을 사용해요/)).toBeInTheDocument()
    fireEvent.click(analyzeButton)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('사용량이 5점보다 적으면 분석을 비활성화하고 부족 이유를 안내한다', () => {
    mocks.aiUsage = {
      ...mocks.aiUsage,
      usage: { used: 96, remaining: 4, limit: 100 },
      hasEnough: vi.fn(() => false),
    }
    renderPage()
    enterText()

    expect(screen.getByRole('button', { name: 'AI로 정리하기' })).toBeDisabled()
    expect(screen.getByText(/이 작업에 필요한 AI 사용량이 부족해요/)).toBeInTheDocument()
  })

  it('분석 요청을 중복 실행하지 않고 분석 중 충돌하는 조작을 막는다', async () => {
    const request = deferred()
    mocks.post.mockReturnValueOnce(request.promise)
    renderPage()
    enterText()

    const analyzeButton = screen.getByRole('button', { name: 'AI로 정리하기' })
    fireEvent.click(analyzeButton)

    expect(screen.getByRole('button', { name: '분석 중...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '지우기' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '분석 중...' }))
    expect(mocks.post).toHaveBeenCalledTimes(1)

    request.resolve({ data: analysis })
    await screen.findByRole('heading', { name: '정리한 할 일' })
  })

  it('임의 타이머 없이 첫 분석과 재분석 결과가 커밋된 뒤 제목에 포커스하고 재분석 중 결과 조작을 막는다', async () => {
    const request = deferred()
    vi.useFakeTimers()
    mocks.post.mockResolvedValueOnce({ data: analysis })
    renderPage()
    enterText()
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))

    await act(async () => {
      await Promise.resolve()
    })

    const heading = screen.getByRole('heading', { name: '정리한 할 일' })
    expect(heading).toHaveFocus()

    const input = screen.getByRole('textbox', { name: '브레인 덤프 입력' })
    input.focus()
    fireEvent.change(input, { target: { value: '수정한 원문' } })
    expect(input).toHaveFocus()

    mocks.post.mockReturnValueOnce(request.promise)
    fireEvent.click(screen.getByRole('button', { name: '다시 분석' }))

    expect(screen.getByRole('button', { name: '지우기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '전체 선택' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '전체 해제' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: '발표 초안 선택' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '새로 작성' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '분석 중...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '선택한 2개 추가' })).toBeDisabled()

    request.resolve({
      data: { ...analysis, tasks: [{ ...analysis.tasks[0], title: '재분석 결과' }] },
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByRole('heading', { name: '정리한 할 일' })).toHaveFocus()
    expect(screen.getByRole('button', { name: '지우기' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '전체 선택' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '전체 해제' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: '재분석 결과 선택' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '새로 작성' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '다시 분석' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '선택한 1개 추가' })).toBeEnabled()
  })

  it('분석 결과를 평평한 목록과 명시적 선택 라벨로 표시하고 일부만 추가한다', async () => {
    mocks.post
      .mockResolvedValueOnce({ data: analysis })
      .mockResolvedValueOnce({ data: {} })
    renderPage()
    enterText()
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))

    const heading = await screen.findByRole('heading', { name: '정리한 할 일' })
    expect(heading).toHaveFocus()
    expect(mocks.announce).toHaveBeenCalledWith('분석이 끝났어요. 후보 2개')
    expect(mocks.dispatchAiUsed).toHaveBeenCalledOnce()

    const list = screen.getByRole('list', { name: '정리한 할 일 목록' })
    expect(list).not.toHaveClass('stagger-in')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    for (const item of items) {
      expect(item).toHaveClass('result-row-refined')
      expect(item).not.toHaveClass('card-retro', 'opacity-40')
    }
    expect(within(list).getByRole('checkbox', { name: '발표 초안 선택' })).toBeChecked()
    expect(within(list).getAllByText('기한 없음')).toHaveLength(2)
    expect(within(list).queryByText('01')).not.toBeInTheDocument()
    expect(mocks.post).toHaveBeenNthCalledWith(1, '/brain-dump', { rawText: '발표 초안과 빨래' })

    fireEvent.click(within(list).getByRole('checkbox', { name: '빨래 널기 선택' }))
    expect(items[1]).not.toHaveClass('opacity-40')
    expect(screen.queryByRole('button', { name: '모두 등록' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '선택한 1개 추가' }))

    await waitFor(() => expect(mocks.post).toHaveBeenLastCalledWith(
      '/brain-dump/77/confirm',
      {
        tasks: [{
          title: '발표 초안',
          description: null,
          priorityScore: 0.7,
          category: 'WORK',
          deadline: null,
          estimatedMinutes: 90,
        }],
      },
    ))
    expect(await screen.findByText('대시보드 도착')).toBeInTheDocument()
  })

  it('전체 선택과 해제는 하나의 추가 버튼에 반영되고 0개일 때 등록하지 않는다', async () => {
    renderPage()
    await analyze()
    mocks.post.mockResolvedValueOnce({ data: {} })

    fireEvent.click(screen.getByRole('button', { name: '전체 해제' }))
    const addButton = screen.getByRole('button', { name: '선택한 0개 추가' })
    expect(addButton).toBeDisabled()
    fireEvent.click(addButton)
    expect(mocks.post).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '전체 선택' }))
    const addAllButton = screen.getByRole('button', { name: '선택한 2개 추가' })
    expect(addAllButton).toBeEnabled()
    fireEvent.click(addAllButton)

    await waitFor(() => expect(mocks.post).toHaveBeenLastCalledWith(
      '/brain-dump/77/confirm',
      {
        tasks: analysis.tasks.map((task) => ({
          title: task.title,
          description: null,
          priorityScore: task.aiPriorityScore,
          category: task.category,
          deadline: null,
          estimatedMinutes: task.estimatedMinutes,
        })),
      },
    ))
  })

  it('결과가 0개면 빈 상태를 표시하고 등록할 수 없다', async () => {
    renderPage()
    await analyze({ dumpId: 77, tasks: [] })

    expect(screen.getByText('정리할 수 있는 할 일을 찾지 못했어요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '선택한 0개 추가' })).toBeDisabled()
  })

  it('긴 한국어 제목과 null 마감을 읽을 수 있게 유지한다', async () => {
    const longTitle = '회의 전에 꼭 확인해야 하는 아주 긴 한국어 발표 자료 검토 및 팀원 의견 반영하기'
    renderPage()
    await analyze({
      dumpId: 78,
      tasks: [{ ...analysis.tasks[0], title: longTitle, deadline: null }],
    })

    const title = screen.getByText(longTitle)
    expect(title).toBeVisible()
    expect(title).toHaveClass('brain-dump-result-title')
    expect(screen.getByText('기한 없음')).toBeInTheDocument()
  })

  it('분석 실패를 화면 안에 유지하고 원문으로 재시도할 수 있다', async () => {
    mocks.post
      .mockRejectedValueOnce({ response: { data: { error: '분석 서버가 바빠요.' } } })
      .mockResolvedValueOnce({ data: analysis })
    renderPage()
    enterText()
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('분석 서버가 바빠요.')
    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('발표 초안과 빨래')

    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
    expect(await screen.findByRole('heading', { name: '정리한 할 일' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('등록 실패를 화면 안에 유지하고 결과와 선택을 보존해 재시도한다', async () => {
    mocks.post
      .mockResolvedValueOnce({ data: analysis })
      .mockRejectedValueOnce({ response: { data: { message: '등록을 완료하지 못했어요.' } } })
      .mockResolvedValueOnce({ data: {} })
    renderPage()
    enterText()
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
    await screen.findByRole('heading', { name: '정리한 할 일' })
    fireEvent.click(screen.getByRole('checkbox', { name: '빨래 널기 선택' }))
    fireEvent.click(screen.getByRole('button', { name: '선택한 1개 추가' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('등록을 완료하지 못했어요.')
    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('발표 초안과 빨래')
    expect(screen.getByRole('checkbox', { name: '발표 초안 선택' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '빨래 널기 선택' })).not.toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: '선택한 1개 추가' }))
    expect(await screen.findByText('대시보드 도착')).toBeInTheDocument()
  })

  it('등록 중에는 결과 조작과 재분석을 막는다', async () => {
    const saveRequest = deferred()
    mocks.post
      .mockResolvedValueOnce({ data: analysis })
      .mockReturnValueOnce(saveRequest.promise)
    renderPage()
    enterText()
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
    await screen.findByRole('heading', { name: '정리한 할 일' })
    fireEvent.click(screen.getByRole('button', { name: '선택한 2개 추가' }))

    expect(screen.getByRole('button', { name: '추가 중...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '다시 분석' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '새로 작성' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '전체 선택' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '전체 해제' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: '발표 초안 선택' })).toBeDisabled()

    saveRequest.resolve({ data: {} })
    expect(await screen.findByText('대시보드 도착')).toBeInTheDocument()
  })

  it('새로 작성과 다시 분석을 제공하지만 초안 저장이나 결과 편집 UI는 만들지 않는다', async () => {
    renderPage()
    await analyze()

    expect(screen.getByRole('button', { name: '새로 작성' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 분석' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /초안 저장|편집/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /결과|제목|설명/ })).not.toBeInTheDocument()
  })
})
