/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss from 'postcss'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Header from './Header'

let authValue
let aiUsageValue
const stylesheet = postcss.parse(readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8'))

function cssDeclarationsFor(selector) {
  let match
  stylesheet.walkRules((rule) => {
    if (!match && rule.selectors.includes(selector)) match = rule
  })
  expect(match, `${selector} CSS 규칙`).toBeTruthy()
  return Object.fromEntries(
    match.nodes
      .filter((node) => node.type === 'decl')
      .map(({ prop, value }) => [prop, value]),
  )
}

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authValue,
}))

vi.mock('../../hooks/useAiUsage', () => ({
  default: () => aiUsageValue,
}))

vi.mock('../DeadlineNudgeMenu', () => ({
  default: ({ variant = 'pill' }) => (
    <button type="button" data-testid={`deadline-${variant}`}>마감 알림</button>
  ),
}))

function renderHeader(props = {}) {
  return render(
    <MemoryRouter>
      <Header {...props} />
    </MemoryRouter>,
  )
}

describe('Header', () => {
  beforeEach(() => {
    authValue = {
      user: { coins: 420, name: '테스트', email: 'local@example.test' },
      logout: vi.fn(),
    }
    aiUsageValue = {
      usage: { used: 32, remaining: 68, limit: 100 },
      loading: false,
    }
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('메뉴를 열지 않아도 AI 잔여량과 코인을 접근 가능한 버튼으로 표시한다', () => {
    renderHeader()

    const ai = screen.getByRole('button', { name: 'AI 잔여량 68 / 100점 안내' })
    const coin = screen.getByRole('button', { name: '보유 코인 420개 안내' })

    expect(ai).toHaveAttribute('type', 'button')
    expect(coin).toHaveAttribute('type', 'button')
    expect(ai).not.toHaveClass('hidden')
    expect(coin).not.toHaveClass('hidden')
    expect(ai).toHaveTextContent('AI 잔여 68 / 100')
    expect(coin.textContent).toContain('420')
  })

  it('프로필 이미지 크기와 무관하게 헤더 아이콘 및 계정 버튼 크기를 고정한다', () => {
    expect(cssDeclarationsFor('.header-refined-icon-button')).toMatchObject({
      width: 'max(44px, 2.75rem)',
      height: 'max(44px, 2.75rem)',
    })
    expect(cssDeclarationsFor('.header-refined-account-button')).toMatchObject({
      width: 'max(44px, 2.75rem)',
      height: 'max(44px, 2.75rem)',
    })
  })

  it('AI 안내를 클릭해 열고 Escape로 닫는다', () => {
    renderHeader()

    const ai = screen.getByRole('button', { name: 'AI 잔여량 68 / 100점 안내' })
    fireEvent.click(ai)

    expect(ai).toHaveAttribute('aria-expanded', 'true')
    const popover = screen.getByText('브레인 덤프 분석').closest('[id]')
    expect(popover).toBeInTheDocument()
    expect(ai).toHaveAttribute('aria-controls', popover.id)
    expect(ai.contains(popover)).toBe(false)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(ai).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('브레인 덤프 분석')).not.toBeInTheDocument()
  })

  it('AI와 코인 안내는 하나만 열리고 외부 클릭으로 닫힌다', () => {
    renderHeader()

    const ai = screen.getByRole('button', { name: 'AI 잔여량 68 / 100점 안내' })
    const coin = screen.getByRole('button', { name: '보유 코인 420개 안내' })

    fireEvent.click(ai)
    fireEvent.click(coin)

    expect(ai).toHaveAttribute('aria-expanded', 'false')
    expect(coin).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByText('브레인 덤프 분석')).not.toBeInTheDocument()
    expect(screen.getByText(/코인샵에서/)).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(coin).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/코인샵에서/)).not.toBeInTheDocument()
  })

  it.each([
    [true, 'AI 잔여량 확인 중'],
    [false, 'AI 잔여량 확인 불가'],
  ])('사용량 미수신 상태를 0으로 바꾸지 않고 구분한다: loading=%s', (loading, label) => {
    aiUsageValue = { usage: null, loading }
    renderHeader()

    const ai = screen.getByRole('button', { name: label })
    expect(ai).toHaveTextContent('AI —')
    expect(ai).not.toHaveTextContent('0')
  })

  it('AI 잔여량 0과 코인의 음수 및 긴 숫자를 그대로 표시한다', () => {
    aiUsageValue = { usage: { used: 100, remaining: 0, limit: 100 }, loading: false }
    authValue.user.coins = -5
    const { unmount } = renderHeader()

    expect(screen.getByRole('button', { name: 'AI 잔여량 0 / 100점 안내' })).toHaveTextContent('0')
    expect(screen.getByRole('button', { name: '보유 코인 -5개 안내' })).toHaveTextContent('-5')

    unmount()
    authValue.user.coins = 1234567
    renderHeader()
    expect(screen.getByRole('button', { name: '보유 코인 1234567개 안내' })).toHaveTextContent('1234567')
  })

  it('메뉴·도움말·설정 콜백과 계정 메뉴의 마감 진입을 유지한다', () => {
    const onOpenDrawer = vi.fn()
    const onOpenHelp = vi.fn()
    const onOpenSettings = vi.fn()
    renderHeader({ onOpenDrawer, onOpenHelp, onOpenSettings })

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }))
    fireEvent.click(screen.getByRole('button', { name: '도움말' }))
    fireEvent.click(screen.getByRole('button', { name: '설정' }))

    expect(onOpenDrawer).toHaveBeenCalledOnce()
    expect(onOpenHelp).toHaveBeenCalledOnce()
    expect(onOpenSettings).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: '계정 메뉴' }))
    expect(screen.getByText('local@example.test')).toBeInTheDocument()
    expect(screen.getByTestId('deadline-mobile-card')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /AI 잔여량/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /보유 코인/ })).toHaveLength(1)
  })
})
