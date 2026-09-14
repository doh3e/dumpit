/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NoticePage from './NoticePage'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('../services/api', () => ({
  default: { get: mocks.get },
}))

const longTitle = '작은 화면에서도 생략되지 않고 여러 줄로 끝까지 읽을 수 있어야 하는 아주 긴 한국어 서비스 업데이트와 운영 안내 제목'
const pinnedNotice = {
  noticeId: 1,
  title: longTitle,
  content: '## 점검 내용\n- **중요**한 변경을 확인해주세요.',
  pinned: true,
  publishAt: '2026-09-10T09:00:00+09:00',
  createdAt: '2026-09-10T08:00:00+09:00',
  updatedAt: '2026-09-10T10:00:00+09:00',
}

const firstPageNotice = {
  noticeId: 2,
  title: '일반 공지 첫 페이지',
  content: '첫 번째 페이지 내용입니다.',
  pinned: false,
  publishAt: '2026-09-09T09:00:00+09:00',
  createdAt: '2026-09-09T09:00:00+09:00',
  updatedAt: '2026-09-09T09:00:00+09:00',
}

const secondPageNotice = {
  noticeId: 3,
  title: '두 번째 페이지 공지',
  content: '두 번째 페이지 내용입니다.',
  pinned: false,
  publishAt: '2026-09-08T09:00:00+09:00',
  createdAt: '2026-09-08T09:00:00+09:00',
  updatedAt: '2026-09-08T09:00:00+09:00',
}

describe('NoticePage', () => {
  beforeEach(() => {
    mocks.get.mockReset().mockImplementation((_url, { params }) => Promise.resolve({
      data: {
        pinned: [pinnedNotice],
        notices: params.page === 0 ? [firstPageNotice] : [secondPageNotice],
        totalPages: 2,
      },
    }))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('refined 제목·표면을 사용하고 긴 공지 제목과 마크다운을 생략 없이 펼친다', async () => {
    render(<NoticePage />)

    const heading = await screen.findByRole('heading', { level: 1, name: '공지사항' })
    expect(heading.parentElement.parentElement).not.toHaveClass('px-4', 'py-8')
    expect(heading).toHaveClass('page-refined-heading')
    const longTitleText = screen.getByText(longTitle)
    expect(longTitleText).toHaveClass('min-w-0', 'break-words', 'whitespace-normal')
    const row = longTitleText.closest('button')
    expect(row).toHaveClass('btn-refined', '!grid', 'min-w-0', 'focus-visible:[outline-offset:-4px]')
    expect(row.closest('.surface-refined')).toBeInTheDocument()
    expect(screen.getByLabelText('고정 공지')).toBeInTheDocument()
    expect(screen.getByText('일반 공지 첫 페이지')).toBeInTheDocument()

    fireEvent.click(row)
    expect(row).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { level: 2, name: '점검 내용' })).toBeInTheDocument()
    expect(screen.getByText('중요')).toBeInTheDocument()
  })

  it('44px refined 페이지 조작과 페이지 이동 시 펼침 초기화를 유지한다', async () => {
    render(<NoticePage />)
    const pinnedRow = await screen.findByRole('button', { name: new RegExp(longTitle) })
    fireEvent.click(pinnedRow)
    expect(pinnedRow).toHaveAttribute('aria-expanded', 'true')

    const next = screen.getByRole('button', { name: '다음 페이지' })
    expect(next).toHaveClass('btn-refined', '!h-11', '!min-w-[max(44px,2.75rem)]')
    fireEvent.click(next)

    expect(await screen.findByText('두 번째 페이지 공지')).toBeInTheDocument()
    await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('/notices', { params: { page: 1 } }))
    expect(screen.getByRole('button', { name: new RegExp(longTitle) })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '2' })).toHaveClass('btn-refined-selected')
  })
})
