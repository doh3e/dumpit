/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import MyPage from './MyPage'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  refreshCoins: vi.fn(),
  reducedMotion: false,
}))

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { get: mocks.get, patch: mocks.patch, delete: mocks.delete },
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ refreshCoins: mocks.refreshCoins }),
}))

vi.mock('../hooks/useReducedMotion', () => ({
  default: () => mocks.reducedMotion,
}))

const profile = {
  nickname: '우주정리인',
  email: 'tester@example.com',
  picture: null,
  bio: '천천히 정리하고 있어요.',
}

const stats = {
  totalDone: 12,
  pomodoroTotalSessions: 7,
  pomodoroTotalMinutes: 185,
  streak: 4,
  coinBalance: 230,
  brainDumpCount: 9,
  ideaCount: 5,
  categoryBreakdown: { WORK: 8, STUDY: 4 },
  heatmap: { '2026-09-11': 2, '2026-09-12': 1 },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyPage />
    </MemoryRouter>,
  )
}

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  }
})

describe('MyPage', () => {
  beforeEach(() => {
    mocks.reducedMotion = false
    mocks.get.mockReset().mockImplementation((url) => {
      if (url === '/me/profile') return Promise.resolve({ data: profile })
      if (url === '/me/stats') return Promise.resolve({ data: stats })
      if (url === '/tasks/overdue') return Promise.resolve({ data: [] })
      if (url === '/me/settings') return Promise.resolve({ data: { aiMemory: '운동은 오전에 계획해줘.' } })
      return Promise.reject(new Error(`unexpected GET ${url}`))
    })
    mocks.patch.mockReset().mockImplementation((url, body) => {
      if (url === '/me/profile') return Promise.resolve({ data: { ...profile, bio: body.bio } })
      if (url === '/me/settings') return Promise.resolve({ data: { aiMemory: body.aiMemory } })
      return Promise.resolve({ data: {} })
    })
    mocks.delete.mockReset().mockResolvedValue({ data: {} })
    mocks.refreshCoins.mockReset()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('보이는 제목과 refined 프로필 편집을 제공하며 취소·저장·초점을 보존한다', async () => {
    renderPage()

    const heading = await screen.findByRole('heading', { level: 1, name: '마이페이지' })
    expect(heading).toHaveClass('page-refined-heading')
    expect(heading.parentElement).not.toHaveClass('px-4', 'py-8')
    const profileCard = screen.getByText('우주정리인').closest('.surface-refined')
    const edit = within(profileCard).getByRole('button', { name: '수정' })
    expect(edit).toHaveClass('btn-refined')
    fireEvent.click(edit)

    const input = screen.getByRole('textbox', { name: '자기소개를 입력하세요' })
    expect(input).toHaveClass('input-refined')
    expect(input).toHaveAttribute('maxlength', '500')
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '취소할 소개' } })
    fireEvent.click(within(profileCard).getByRole('button', { name: '취소' }))
    expect(screen.getByText(profile.bio)).toBeInTheDocument()

    fireEvent.click(within(profileCard).getByRole('button', { name: '수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '자기소개를 입력하세요' }), { target: { value: '새 자기소개' } })
    fireEvent.click(within(profileCard).getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith('/me/profile', { bio: '새 자기소개' }))
    expect(await screen.findByText('새 자기소개')).toBeInTheDocument()
  })

  it('AI 메모리 500자·초점·취소를 유지하고 저장 실패 뒤 재시도한다', async () => {
    mocks.patch
      .mockRejectedValueOnce({ response: { data: { message: '저장할 수 없어요.' } } })
      .mockResolvedValueOnce({ data: { aiMemory: '오후에는 짧은 일을 추천해줘.' } })
    renderPage()
    await screen.findByRole('heading', { name: '마이페이지' })

    const memoryCard = screen.getByText(/AI 메모리/).closest('.surface-refined')
    fireEvent.click(within(memoryCard).getByRole('button', { name: '수정' }))
    const memoryInput = screen.getByRole('textbox', { name: 'AI 메모리' })
    expect(memoryInput).toHaveClass('input-refined')
    expect(memoryInput).toHaveAttribute('maxlength', '500')
    expect(memoryInput).toHaveFocus()
    fireEvent.change(memoryInput, { target: { value: '취소할 메모리' } })
    fireEvent.click(within(memoryCard).getByRole('button', { name: '취소' }))
    expect(screen.getByText('운동은 오전에 계획해줘.')).toBeInTheDocument()

    fireEvent.click(within(memoryCard).getByRole('button', { name: '수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'AI 메모리' }), { target: { value: ' 오후에는 짧은 일을 추천해줘. ' } })
    fireEvent.click(within(memoryCard).getByRole('button', { name: '저장' }))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('저장할 수 없어요.'))
    expect(screen.getByRole('textbox', { name: 'AI 메모리' })).toHaveValue(' 오후에는 짧은 일을 추천해줘. ')

    fireEvent.click(within(memoryCard).getByRole('button', { name: '저장' }))
    await waitFor(() => expect(mocks.patch).toHaveBeenLastCalledWith('/me/settings', { aiMemory: '오후에는 짧은 일을 추천해줘.' }))
    expect(await screen.findByText('오후에는 짧은 일을 추천해줘.')).toBeInTheDocument()
  })

  it('통계 group의 화살표와 포인터 드래그를 유지하고 reduced motion에서는 smooth를 끈다', async () => {
    mocks.reducedMotion = true
    renderPage()
    const slider = await screen.findByRole('group', { name: '통계 카드, 좌우 화살표로 이동' })
    const scrollBy = vi.fn()
    slider.scrollBy = scrollBy
    slider.setPointerCapture = vi.fn()
    slider.scrollLeft = 20

    expect(slider).toHaveAttribute('tabindex', '0')
    expect(slider).toHaveStyle({ scrollBehavior: 'auto' })
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(scrollBy).toHaveBeenNthCalledWith(1, { left: 140, behavior: 'auto' })
    expect(scrollBy).toHaveBeenNthCalledWith(2, { left: -140, behavior: 'auto' })

    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(slider, { clientX: 130, pointerId: 1 })
    expect(slider.scrollLeft).toBe(-10)
  })

  it('회원 탈퇴 확인을 refined Dialog와 파괴적 버튼으로 표시한다', async () => {
    renderPage()
    await screen.findByRole('heading', { name: '마이페이지' })
    const withdraw = screen.getByRole('button', { name: '회원 탈퇴' })
    expect(withdraw).toHaveClass('btn-refined', 'btn-refined-danger')
    fireEvent.click(withdraw)

    const dialog = screen.getByRole('dialog', { name: '회원 탈퇴' })
    expect(dialog.firstElementChild).toHaveClass('surface-refined', 'p-5')
    expect(within(dialog).getByRole('heading', { level: 2, name: '회원 탈퇴' })).toHaveClass('font-galmuri')
    expect(within(dialog).getByRole('button', { name: '취소' })).toHaveClass('btn-refined')
    expect(within(dialog).getByRole('button', { name: '탈퇴' })).toHaveClass('btn-refined', 'btn-refined-danger')
  })
})
