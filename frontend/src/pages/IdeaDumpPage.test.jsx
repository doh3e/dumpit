/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import IdeaDumpPage from './IdeaDumpPage'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  dispatchAiUsed: vi.fn(),
  aiUsage: null,
}))

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: {
      get: mocks.get,
      post: mocks.post,
      patch: mocks.patch,
      put: mocks.put,
      delete: mocks.delete,
    },
  }
})

vi.mock('../hooks/useAiUsage', () => ({
  default: () => mocks.aiUsage,
  dispatchAiUsed: mocks.dispatchAiUsed,
}))

const firstIdea = {
  ideaId: 1,
  title: '첫 번째 아이디어',
  content: '첫 번째 본문',
  category: 'OTHER',
  pinned: false,
  parentIdeaId: null,
  convertedTaskId: null,
  stickerCode: null,
  updatedAt: '2026-09-11T09:00:00+09:00',
}

const secondIdea = {
  ...firstIdea,
  ideaId: 2,
  title: '두 번째 아이디어',
  content: '두 번째 본문',
  updatedAt: '2026-09-11T10:00:00+09:00',
}

function renderPage() {
  const router = createMemoryRouter(
    [{ path: '/ideas', element: <IdeaDumpPage /> }],
    { initialEntries: ['/ideas'] },
  )
  return render(<RouterProvider router={router} />)
}

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('IdeaDumpPage', () => {
  let ideas
  let confirmSpy

  beforeEach(() => {
    ideas = [firstIdea, secondIdea]
    mocks.get.mockReset().mockImplementation((url) => {
      if (url === '/ideas') return Promise.resolve({ data: ideas })
      return Promise.reject(new Error(`예상하지 못한 GET ${url}`))
    })
    mocks.post.mockReset()
    mocks.patch.mockReset()
    mocks.put.mockReset()
    mocks.delete.mockReset()
    mocks.dispatchAiUsed.mockReset()
    mocks.aiUsage = {
      usage: {
        used: 25,
        remaining: 75,
        limit: 100,
        resetAt: '2026-09-12T00:00:00+09:00',
      },
      loading: false,
      refresh: vi.fn(),
      hasEnough: vi.fn((cost) => cost <= 75),
    }
    localStorage.clear()
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('첫 항목을 선택하고 검색한 다른 항목을 재조회 뒤에도 유지한다', async () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: '아이디어 덤프' })).toHaveClass('page-refined-heading')
    await waitFor(() => expect(screen.getByRole('textbox', { name: '아이디어 제목' })).toHaveValue('첫 번째 아이디어'))
    expect(screen.getByText('저장한 아이디어').parentElement).toHaveClass('surface-refined', 'px-5', 'py-3')

    const detailSection = screen.getByRole('heading', { name: '아이디어 상세' }).closest('section')
    expect(detailSection).toHaveClass('surface-refined', 'p-5')
    expect(detailSection).not.toHaveClass('card-retro')

    const firstRow = screen.getByRole('button', { name: /첫 번째 아이디어/ }).parentElement
    expect(firstRow).toHaveClass('surface-refined', 'border', 'border-edge', 'bg-chip')
    expect(firstRow).not.toHaveClass('btn-refined-selected', 'border-2', 'shadow-retro')

    const searchInput = screen.getByRole('textbox', { name: '검색' })
    fireEvent.change(searchInput, { target: { value: '두 번째' } })
    expect(within(searchInput.closest('section')).queryByRole('button', { name: /첫 번째 아이디어/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /두 번째 아이디어/ }))
    expect(screen.getByRole('textbox', { name: '아이디어 제목' })).toHaveValue('두 번째 아이디어')

    ideas = [{ ...firstIdea, title: '첫 번째 아이디어 갱신' }, { ...secondIdea, title: '두 번째 아이디어 갱신' }]
    mocks.patch.mockResolvedValueOnce({ data: secondIdea })
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: '아이디어 제목' })).toHaveValue('두 번째 아이디어 갱신'))
  })

  it('새 아이디어 모드가 커밋된 뒤 제목에 초점을 주고 생성 항목을 선택한다', async () => {
    mocks.post.mockImplementation(async (url) => {
      if (url !== '/ideas') throw new Error(`예상하지 못한 POST ${url}`)
      const created = { ...firstIdea, ideaId: 3, title: '세 번째 아이디어', content: '' }
      ideas = [...ideas, created]
      return { data: created }
    })
    renderPage()
    await screen.findByRole('textbox', { name: '아이디어 제목' })

    const newButton = screen.getByRole('button', { name: '새 아이디어', exact: true })
    const dumpButton = screen.getByRole('button', { name: '덤프', exact: true })
    expect(newButton).toHaveClass('btn-refined')
    expect(dumpButton).toHaveAttribute('aria-pressed', 'true')
    expect(newButton).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(newButton)
    const titleInput = screen.getByRole('textbox', { name: '제목', exact: true })
    await waitFor(() => expect(titleInput).toHaveFocus())
    expect(titleInput).toHaveClass('input-refined')
    const newIdeaForm = within(titleInput.closest('.space-y-3'))
    const otherCategory = newIdeaForm.getByRole('button', { name: '기타', exact: true })
    const workCategory = newIdeaForm.getByRole('button', { name: '업무', exact: true })
    expect(newButton).toHaveAttribute('aria-pressed', 'true')
    expect(dumpButton).toHaveAttribute('aria-pressed', 'false')
    expect(otherCategory).toHaveClass('btn-refined')
    expect(otherCategory).toHaveAttribute('aria-pressed', 'true')
    expect(workCategory).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(workCategory)
    expect(otherCategory).toHaveAttribute('aria-pressed', 'false')
    expect(workCategory).toHaveAttribute('aria-pressed', 'true')

    fireEvent.change(titleInput, { target: { value: '세 번째 아이디어' } })
    fireEvent.keyDown(titleInput, { key: 'Enter' })

    await waitFor(() => expect(screen.getByRole('textbox', { name: '아이디어 제목' })).toHaveValue('세 번째 아이디어'))
  })

  it('선택한 아이디어를 삭제하면 남은 첫 아이디어를 선택한다', async () => {
    mocks.delete.mockImplementation(async () => {
      ideas = [firstIdea]
      return { data: {} }
    })
    renderPage()
    await screen.findByRole('textbox', { name: '아이디어 제목' })
    fireEvent.click(screen.getByRole('button', { name: /두 번째 아이디어/ }))
    expect(screen.getByRole('textbox', { name: '아이디어 제목' })).toHaveValue('두 번째 아이디어')

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: '아이디어 제목' })).toHaveValue('첫 번째 아이디어'))
    expect(confirmSpy).toHaveBeenCalledWith('이 아이디어를 삭제할까요?')
  })

  it('덤프 입력과 분석 행동에 refined 표현과 5점 inline 안내를 사용한다', async () => {
    renderPage()
    await screen.findByRole('textbox', { name: '아이디어 제목' })

    const dumpButton = screen.getByRole('button', { name: '덤프', exact: true })
    const scratchInput = screen.getByRole('textbox', { name: '아이디어 덤프 입력' })
    const extractButton = screen.getByRole('button', { name: 'AI로 아이디어 추출' })
    expect(dumpButton).toHaveClass('btn-refined', 'btn-refined-selected')
    expect(scratchInput).toHaveClass('input-refined')
    expect(scratchInput).toHaveAttribute('maxlength', '2000')
    expect(extractButton).toHaveClass('btn-refined', 'btn-refined-primary')
    expect(screen.getByText('사용 25 / 100')).toBeInTheDocument()
    expect(screen.getByText('잔여 75점')).toBeInTheDocument()
    expect(screen.getByText(/이 작업은 5점을 사용해요/)).toBeInTheDocument()
  })

  it('조회 중과 빈 목록을 그림자 없는 refined 표면으로 표시한다', async () => {
    const request = deferred()
    mocks.get.mockReset().mockReturnValueOnce(request.promise)
    renderPage()

    const loadingSurface = screen.getByText('불러오는 중...').parentElement
    expect(loadingSurface).toHaveClass('surface-refined', 'px-5', 'py-12')
    expect(loadingSurface).not.toHaveClass('card-retro')

    await act(async () => request.resolve({ data: [] }))

    const emptySurface = await screen.findByText('아이디어가 아직 없어요')
    expect(emptySurface.parentElement).toHaveClass('surface-refined', 'px-5', 'py-12')
    expect(emptySurface.parentElement).not.toHaveClass('card-retro')
  })

  it('하위 아이디어 영역과 선택 버튼을 refined 표면과 44px 조작 영역으로 표시한다', async () => {
    ideas = [firstIdea, { ...secondIdea, title: '연결된 하위 아이디어', parentIdeaId: firstIdea.ideaId }]
    renderPage()
    await waitFor(() => expect(screen.getByRole('textbox', { name: '아이디어 제목' })).toHaveValue('첫 번째 아이디어'))

    const childHeading = screen.getByRole('heading', { name: '하위 아이디어' })
    expect(childHeading.closest('.surface-refined')).toHaveClass('border', 'p-3')
    const childButton = screen.getByRole('button', { name: /연결된 하위 아이디어/ })
    expect(childButton).toHaveClass('btn-refined', '!block', 'w-full', 'text-left')
    expect(childButton).not.toHaveClass('border-2')
  })

  it('분석 결과의 중첩 계층은 유지하되 장식 진입과 중첩 카드를 사용하지 않는다', async () => {
    mocks.post.mockResolvedValueOnce({
      data: {
        ideas: [{
          title: '상위 분석 아이디어',
          content: '상위 본문',
          category: 'OTHER',
          children: [{ title: '하위 분석 아이디어', content: '', category: 'OTHER', children: [] }],
        }],
      },
    })
    renderPage()
    const scratchInput = screen.getByRole('textbox', { name: '아이디어 덤프 입력' })
    fireEvent.change(scratchInput, { target: { value: '분석할 원문' } })
    fireEvent.click(screen.getByRole('button', { name: 'AI로 아이디어 추출' }))

    const resultList = await screen.findByRole('list', { name: '분석된 아이디어' })
    expect(resultList).not.toHaveClass('stagger-in')
    const resultItems = within(resultList).getAllByRole('listitem')
    expect(resultItems).toHaveLength(2)
    expect(resultItems[0]).toHaveClass('result-row-refined')
    expect(resultItems[1]).toHaveClass('result-row-refined')
    expect(resultItems[0]).not.toHaveClass('rounded-lg', 'border-2')
  })

  it('분석 실패 뒤 오류와 원문을 보존해 같은 내용으로 다시 시도할 수 있다', async () => {
    mocks.post
      .mockRejectedValueOnce({ response: { data: { error: '분석 서버가 바빠요.' } } })
      .mockResolvedValueOnce({ data: { ideas: [] } })
    renderPage()
    const scratchInput = screen.getByRole('textbox', { name: '아이디어 덤프 입력' })
    fireEvent.change(scratchInput, { target: { value: '보존할 원문' } })
    fireEvent.click(screen.getByRole('button', { name: 'AI로 아이디어 추출' }))

    expect(await screen.findByText('분석 서버가 바빠요.')).toBeInTheDocument()
    expect(scratchInput).toHaveValue('보존할 원문')
    expect(localStorage.getItem('dumpit:idea-scratch')).toBe('보존할 원문')

    fireEvent.click(screen.getByRole('button', { name: 'AI로 아이디어 추출' }))
    expect(await screen.findByText('분석 결과 — 확인 후 저장하세요')).toBeInTheDocument()
    expect(scratchInput).toHaveValue('보존할 원문')
  })
})
