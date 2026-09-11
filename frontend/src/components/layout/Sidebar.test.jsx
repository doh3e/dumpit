/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss from 'postcss'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Sidebar from './Sidebar'

let authValue
const { pomodoroMock } = vi.hoisted(() => ({ pomodoroMock: vi.fn() }))
const stylesheet = postcss.parse(readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8'))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authValue,
}))

vi.mock('../PomodoroTimer', () => ({
  default: (props) => {
    pomodoroMock(props)
    return <div data-testid="pomodoro-timer">타이머</div>
  },
}))

function cssDeclarationsFor(selector, root = stylesheet) {
  let match
  root.walkRules((rule) => {
    if (!match && rule.selectors.includes(selector)) match = rule
  })
  expect(match, `${selector} CSS 규칙`).toBeTruthy()
  return Object.fromEntries(
    match.nodes
      .filter((node) => node.type === 'decl')
      .map(({ prop, value }) => [prop, value]),
  )
}

function renderSidebar({ initialEntry = '/dashboard', user = { isAdmin: false }, ...props } = {}) {
  authValue = { user }
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Sidebar
        onOpenSettings={vi.fn()}
        onOpenHelp={vi.fn()}
        tasks={[]}
        focusRecommendation={null}
        isDrawerOpen={false}
        onCloseDrawer={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe = vi.fn()
      disconnect = vi.fn()
    }
    globalThis.ResizeObserver = ResizeObserverMock
    window.dumpitDesktop = false
    pomodoroMock.mockClear()
  })

  afterEach(() => {
    cleanup()
    delete globalThis.ResizeObserver
    delete window.dumpitDesktop
    vi.restoreAllMocks()
  })

  it('실제 메뉴 경로와 현재 경로 표시를 유지한다', () => {
    renderSidebar({ initialEntry: '/ideas' })

    const nav = screen.getByRole('navigation', { name: '주 메뉴' })
    const routes = [
      ['대시보드', '/dashboard'],
      ['브레인 덤프', '/brain-dump'],
      ['아이디어 덤프', '/ideas'],
      ['루틴', '/routines'],
      ['상점', '/shop'],
      ['마이페이지', '/mypage'],
    ]

    for (const [name, path] of routes) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', path)
    }
    expect(within(nav).getByRole('link', { name: '아이디어 덤프' })).toHaveAttribute('aria-current', 'page')
  })

  it('관리자에게만 관리자 페이지 경로를 제공한다', () => {
    const { unmount } = renderSidebar({ user: { isAdmin: false } })
    expect(screen.queryByRole('link', { name: /관리자 페이지/ })).not.toBeInTheDocument()

    unmount()
    renderSidebar({ user: { isAdmin: true } })
    expect(screen.getByRole('link', { name: /관리자 페이지/ })).toHaveAttribute('href', '/admin')
  })

  it('도움말·설정·닫기 콜백과 Escape 탈출구를 유지한다', () => {
    const onOpenHelp = vi.fn()
    const onOpenSettings = vi.fn()
    const onCloseDrawer = vi.fn()
    renderSidebar({ isDrawerOpen: true, onOpenHelp, onOpenSettings, onCloseDrawer })

    const drawer = screen.getByRole('dialog', { name: '메뉴' })
    expect(drawer).toHaveFocus()

    fireEvent.click(within(drawer).getByRole('button', { name: /도움말/ }))
    expect(onOpenHelp).toHaveBeenCalledOnce()
    expect(onCloseDrawer).toHaveBeenCalledTimes(1)

    fireEvent.click(within(drawer).getByRole('button', { name: '설정' }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
    expect(onCloseDrawer).toHaveBeenCalledTimes(2)

    fireEvent.click(within(drawer).getByRole('button', { name: '메뉴 닫기' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCloseDrawer).toHaveBeenCalledTimes(4)
  })

  it('메뉴 선택도 드로어 닫기 콜백을 호출한다', () => {
    const onCloseDrawer = vi.fn()
    renderSidebar({ isDrawerOpen: true, onCloseDrawer })

    const drawer = screen.getByRole('dialog', { name: '메뉴' })
    fireEvent.click(within(drawer).getByRole('link', { name: '브레인 덤프' }))
    expect(onCloseDrawer).toHaveBeenCalledOnce()
  })

  it('추천 할 일과 전체 할 일 목록을 compact 타이머에 그대로 전달한다', () => {
    const tasks = [
      { taskId: 7, title: '발표 초안' },
      { taskId: 8, title: '빨래 널기' },
    ]
    renderSidebar({ tasks, focusRecommendation: { task: tasks[0] } })

    expect(pomodoroMock).toHaveBeenCalledWith(expect.objectContaining({
      tasks,
      recommendedTaskId: 7,
      compact: true,
    }))
  })

  it('기존 반응형 로고 자산을 80px 표시 크기에 맞춘다', () => {
    renderSidebar()

    const logo = screen.getByRole('img', { name: '덤핏' })
    expect(logo).toHaveAttribute('sizes', '80px')
    expect(logo).toHaveClass('h-20')
    expect(logo.getAttribute('srcset')).toContain('/logo_144.webp 144w')
  })

  it('메뉴 항목은 Galmuri와 최소 44px 조작 영역을 사용하고 색만 전환한다', () => {
    renderSidebar()

    const nav = screen.getByRole('navigation', { name: '주 메뉴' })
    const dashboard = within(nav).getByRole('link', { name: '대시보드' })
    expect(dashboard).toHaveClass('sidebar-refined-menu-item', 'font-galmuri')
    expect(dashboard).not.toHaveClass('transition-all')
    expect(screen.getByText('뽀모도로')).toBeInTheDocument()

    expect(cssDeclarationsFor('.sidebar-refined-menu-item')).toMatchObject({
      'min-height': 'max(44px, 2.75rem)',
      'min-width': 'max(44px, 2.75rem)',
      'border-radius': '.5rem',
      transition: 'background-color 80ms ease, color 80ms ease',
    })

    let reducedMotion
    stylesheet.walkAtRules('media', (rule) => {
      if (!rule.params.includes('prefers-reduced-motion')) return
      rule.walkRules((nestedRule) => {
        if (nestedRule.selectors.includes('.sidebar-refined-menu-item')) reducedMotion = rule
      })
    })
    expect(cssDeclarationsFor('.sidebar-refined-menu-item', reducedMotion)).toMatchObject({ transition: 'none' })
  })
})
