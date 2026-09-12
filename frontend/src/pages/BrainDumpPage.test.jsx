/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import BrainDumpPage from './BrainDumpPage'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  dispatchAiUsed: vi.fn(),
  announce: vi.fn(),
  clearDraft: vi.fn(),
  notifyToast: vi.fn(),
  readDraft: vi.fn(),
  user: { email: 'a@example.com' },
  writeDraft: vi.fn(),
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

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user }),
}))

vi.mock('../services/brainDumpDraft', () => ({
  clearDraft: (...args) => mocks.clearDraft(...args),
  readDraft: (...args) => mocks.readDraft(...args),
  writeDraft: (...args) => mocks.writeDraft(...args),
}))

vi.mock('../services/notifyToast', () => ({
  notifyToast: (...args) => mocks.notifyToast(...args),
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

function renderPageWithoutUnmountingOnNavigation() {
  return render(
    <MemoryRouter initialEntries={['/brain-dump']}>
      <Routes>
        <Route path="*" element={<BrainDumpPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function enterText(value = '발표 초안과 빨래') {
  fireEvent.change(screen.getByRole('textbox', { name: '브레인 덤프 입력' }), {
    target: { value },
  })
}

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

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
    mocks.clearDraft.mockReset()
    mocks.notifyToast.mockReset()
    mocks.readDraft.mockReset().mockReturnValue(null)
    mocks.user = { email: 'a@example.com' }
    mocks.writeDraft.mockReset().mockImplementation((_account, rawText) => (
      rawText ? { version: 1, rawText, updatedAt: 1 } : null
    ))
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

  it('editor를 열기 전에 현재 계정 원문을 복구하고 저장 범위를 짧게 안내한다', () => {
    mocks.readDraft.mockReturnValue({ version: 1, rawText: '  복구 원문\n ', updatedAt: 1 })

    renderPage()

    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('  복구 원문\n ')
    expect(screen.getByText('원문 초안 저장됨')).toBeInTheDocument()
    expect(screen.getByText(/같은 기기의 현재 브라우저\/앱에서 계정별로 마지막 수정부터 7일간/)).toBeInTheDocument()
    const summary = screen.getByText('초안 저장 범위 자세히')
    const details = summary.closest('details')
    expect(details).not.toHaveAttribute('open')
    expect(screen.getByText(/웹·데스크톱·Android 사이에는 동기화되지 않아요/)).not.toBeVisible()
    fireEvent.click(summary)
    expect(details).toHaveAttribute('open')
    expect(screen.getByText(/웹·데스크톱·Android 사이에는 동기화되지 않아요/)).toBeVisible()
    expect(screen.getByText(/화면 이동·새로고침·자동 세션 만료에는 남아 있어요/)).toBeVisible()
    expect(screen.getByText(/지우기·등록 완료·직접 로그아웃·탈퇴 때 이 브라우저\/앱 초안이 삭제돼요/)).toBeVisible()
    expect(mocks.readDraft).toHaveBeenCalledWith('a@example.com')
  })

  it('입력 직후 원문 그대로 저장하고 최신 저장 성공과 실패를 구분한다', () => {
    renderPage()
    enterText('  공백도 저장\n ')

    expect(mocks.writeDraft).toHaveBeenCalledWith('a@example.com', '  공백도 저장\n ')
    expect(screen.getByText('원문 초안 저장됨')).toBeInTheDocument()

    mocks.writeDraft.mockImplementationOnce(() => { throw new Error('민감한 저장 오류') })
    enterText('저장 실패 원문')
    expect(screen.getByRole('status')).toHaveTextContent('이 기기에 저장하지 못했어요')
    expect(screen.queryByText('민감한 저장 오류')).not.toBeInTheDocument()
  })

  it('지우기 확인 뒤에만 현재 계정 초안·원문·결과를 함께 없앤다', async () => {
    renderPage()
    await analyze()

    fireEvent.click(screen.getByRole('button', { name: '새로 작성' }))
    const dialog = screen.getByRole('dialog', { name: '원문과 결과 지우기' })
    expect(within(dialog).getByText(/원문과 AI 분석 결과가 모두 사라져요/)).toBeInTheDocument()
    expect(mocks.clearDraft).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: '지우기' }))

    expect(mocks.clearDraft).toHaveBeenCalledWith('a@example.com')
    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('')
    expect(screen.queryByRole('heading', { name: '정리한 할 일' })).not.toBeInTheDocument()
  })

  it('A→B→A 계정 전환 뒤 첫 A의 늦은 분석 응답을 현재 A 화면에 반영하지 않는다', async () => {
    const request = deferred()
    mocks.post.mockReturnValueOnce(request.promise)
    const rendered = renderPage()
    enterText('A 원문')
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))

    mocks.user = { email: 'b@example.com' }
    mocks.readDraft.mockReturnValueOnce({ version: 1, rawText: 'B 원문', updatedAt: 2 })
    rendered.rerender(
      <MemoryRouter initialEntries={['/brain-dump']}>
        <Routes>
          <Route path="/brain-dump" element={<BrainDumpPage />} />
          <Route path="/dashboard" element={<p>대시보드 도착</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('B 원문')

    mocks.user = { email: 'a@example.com' }
    mocks.readDraft.mockReturnValueOnce({ version: 1, rawText: '새 A 원문', updatedAt: 3 })
    rendered.rerender(
      <MemoryRouter initialEntries={['/brain-dump']}>
        <Routes>
          <Route path="/brain-dump" element={<BrainDumpPage />} />
          <Route path="/dashboard" element={<p>대시보드 도착</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('새 A 원문')

    request.resolve({ data: analysis })
    await act(async () => { await request.promise })
    expect(screen.queryByRole('heading', { name: '정리한 할 일' })).not.toBeInTheDocument()
    expect(mocks.dispatchAiUsed).not.toHaveBeenCalled()
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
    expect(mocks.clearDraft).toHaveBeenCalledWith('a@example.com')
  })

  it('등록 성공 뒤 초안 삭제 실패는 등록을 재시도하지 않고 이동 후 오류로 알린다', async () => {
    mocks.post.mockResolvedValueOnce({ data: analysis }).mockResolvedValueOnce({ data: {} })
    mocks.clearDraft.mockImplementationOnce(() => { throw new Error('민감한 삭제 오류') })
    renderPage()
    enterText()
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
    await screen.findByRole('heading', { name: '정리한 할 일' })

    fireEvent.click(screen.getByRole('button', { name: '선택한 2개 추가' }))

    expect(await screen.findByText('대시보드 도착')).toBeInTheDocument()
    expect(mocks.post).toHaveBeenCalledTimes(2)
    expect(mocks.notifyToast).toHaveBeenCalledWith('할 일은 등록했지만 원문 초안을 지우지 못했어요.')
    expect(mocks.notifyToast.mock.calls.flat().join(' ')).not.toContain('민감한 삭제 오류')
  })

  it('등록 대기 중 editor와 캡처된 변경 경로를 잠가 새 원문 손실을 막는다', async () => {
    const confirm = deferred()
    mocks.post.mockResolvedValueOnce({ data: analysis }).mockReturnValueOnce(confirm.promise)
    const rendered = renderPage()
    enterText('등록 전 원문')
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
    await screen.findByRole('heading', { name: '정리한 할 일' })

    const editor = screen.getByRole('textbox', { name: '브레인 덤프 입력' })
    const writesBeforeConfirm = mocks.writeDraft.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: '선택한 2개 추가' }))
    expect(editor).toBeDisabled()
    fireEvent.change(editor, { target: { value: '등록 중 새 원문' } })
    expect(mocks.writeDraft).toHaveBeenCalledTimes(writesBeforeConfirm)

    confirm.resolve({ data: {} })
    await act(async () => { await confirm.promise })
    expect(await screen.findByText('대시보드 도착')).toBeInTheDocument()
    rendered.unmount()
    renderPage()
    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('')
  })

  it('등록 성공 뒤 화면 전환이 늦어져도 재등록과 입력을 계속 잠근다', async () => {
    mocks.post.mockResolvedValueOnce({ data: analysis }).mockResolvedValueOnce({ data: {} })
    renderPageWithoutUnmountingOnNavigation()
    enterText('한 번만 등록할 원문')
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
    await screen.findByRole('heading', { name: '정리한 할 일' })

    const editor = screen.getByRole('textbox', { name: '브레인 덤프 입력' })
    const add = screen.getByRole('button', { name: '선택한 2개 추가' })
    fireEvent.click(add)
    await waitFor(() => expect(mocks.clearDraft).toHaveBeenCalledTimes(1))
    expect(add).toBeDisabled()
    expect(editor).toBeDisabled()
    fireEvent.click(add)
    fireEvent.change(editor, { target: { value: '늦은 새 원문' } })

    expect(mocks.post).toHaveBeenCalledTimes(2)
    expect(mocks.clearDraft).toHaveBeenCalledTimes(1)
    expect(mocks.writeDraft).toHaveBeenCalledTimes(1)
  })

  it('A→B→A 뒤 끝난 예전 등록 응답은 현재 A 초안을 지우거나 이동하지 않는다', async () => {
    const confirm = deferred()
    mocks.post.mockResolvedValueOnce({ data: analysis }).mockReturnValueOnce(confirm.promise)
    const rendered = renderPage()
    enterText('첫 A 원문')
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
    await screen.findByRole('heading', { name: '정리한 할 일' })
    fireEvent.click(screen.getByRole('button', { name: '선택한 2개 추가' }))

    mocks.user = { email: 'b@example.com' }
    mocks.readDraft.mockReturnValueOnce({ version: 1, rawText: 'B 원문', updatedAt: 2 })
    rendered.rerender(
      <MemoryRouter initialEntries={['/brain-dump']}>
        <Routes>
          <Route path="/brain-dump" element={<BrainDumpPage />} />
          <Route path="/dashboard" element={<p>대시보드 도착</p>} />
        </Routes>
      </MemoryRouter>,
    )
    mocks.user = { email: 'a@example.com' }
    mocks.readDraft.mockReturnValueOnce({ version: 1, rawText: '새 A 원문', updatedAt: 3 })
    rendered.rerender(
      <MemoryRouter initialEntries={['/brain-dump']}>
        <Routes>
          <Route path="/brain-dump" element={<BrainDumpPage />} />
          <Route path="/dashboard" element={<p>대시보드 도착</p>} />
        </Routes>
      </MemoryRouter>,
    )

    confirm.resolve({ data: {} })
    await act(async () => { await confirm.promise })
    expect(mocks.clearDraft).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('새 A 원문')
    expect(screen.queryByText('대시보드 도착')).not.toBeInTheDocument()
  })

  it('같은 계정으로 화면을 다시 연 뒤 끝난 예전 등록 응답은 새 초안을 지우지 않는다', async () => {
    const confirm = deferred()
    mocks.post.mockResolvedValueOnce({ data: analysis }).mockReturnValueOnce(confirm.promise)
    const first = renderPage()
    enterText('이전 화면 원문')
    fireEvent.click(screen.getByRole('button', { name: 'AI로 정리하기' }))
    await screen.findByRole('heading', { name: '정리한 할 일' })
    fireEvent.click(screen.getByRole('button', { name: '선택한 2개 추가' }))
    first.unmount()

    mocks.readDraft.mockReturnValueOnce({ version: 1, rawText: '다시 연 화면 원문', updatedAt: 4 })
    renderPage()
    confirm.resolve({ data: {} })
    await act(async () => { await confirm.promise })

    expect(mocks.clearDraft).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: '브레인 덤프 입력' })).toHaveValue('다시 연 화면 원문')
    expect(screen.queryByText('대시보드 도착')).not.toBeInTheDocument()
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
