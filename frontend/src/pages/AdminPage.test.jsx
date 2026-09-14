/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminPage from './AdminPage'

const { api } = vi.hoisted(() => ({
  api: {
    get: vi.fn((path) => Promise.resolve({
      data: path === '/admin/notices'
        ? [{
            noticeId: 7,
            title: '테스트 공지',
            content: '가짜 관리자 데이터입니다.',
            publishAt: '2026-09-11T12:00:00',
            status: 'PUBLISHED',
            pinned: false,
            popup: false,
          }]
        : path === '/admin/stats/today'
          ? { joinedUsers: 0, createdTasks: 0, createdRoutines: 0, brainDumps: 0, aiUsageLogs: 0, aiUsed: 0 }
          : [],
    })),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../services/api', () => ({
  default: api,
  getApiErrorMessage: (_error, fallback) => fallback,
}))

describe('AdminPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('관리자 전용 API의 가짜 데이터로 탭을 전환하고 refined 상태를 표시한다', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('접수된 문의가 없어요.')).toBeInTheDocument())

    expect(api.get).toHaveBeenCalledWith('/admin/inquiries')
    expect(api.get).toHaveBeenCalledWith('/admin/users')
    expect(api.get).toHaveBeenCalledWith('/admin/notices')
    const notices = screen.getByRole('button', { name: '공지' })
    expect(notices).toHaveClass('btn-refined')
    fireEvent.click(notices)

    expect(await screen.findByText('테스트 공지')).toBeInTheDocument()
    expect(screen.getByText('공지 작성').closest('.surface-refined')).toBeInTheDocument()
  })

  it('공지 편집을 취소하면 새 공지 폼으로 돌아가며 저장 요청을 보내지 않는다', async () => {
    render(<AdminPage />)
    fireEvent.click(screen.getByRole('button', { name: '공지' }))
    await screen.findByText('테스트 공지')

    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    expect(screen.getByLabelText('제목')).toHaveValue('테스트 공지')
    fireEvent.click(screen.getByRole('button', { name: '새 공지' }))

    expect(screen.getByLabelText('제목')).toHaveValue('')
    expect(api.patch).not.toHaveBeenCalled()
    expect(api.post).not.toHaveBeenCalled()
  })
})
