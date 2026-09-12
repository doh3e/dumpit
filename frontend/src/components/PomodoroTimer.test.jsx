// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import PomodoroTimer from './PomodoroTimer'

// 타이머만 검증한다 — 서버 호출·코인 갱신은 이 테스트의 관심사가 아니다
vi.mock('../services/api', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { coins: 1 } }) },
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ refreshCoins: vi.fn() }),
}))

const clock = () => screen.getByTestId('pomodoro-clock').textContent.replace(/\s/g, '')

/** 가짜 타이머로 시간을 흘린다 — 상태 갱신과 대기 중인 프라미스를 함께 정리 */
async function advance(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

async function click(name) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }))
  })
}

describe('PomodoroTimer 카운트다운', () => {
  beforeEach(() => {
    localStorage.clear()
    // 집중 1분 / 휴식 1분 / 2세트 — 전환을 빨리 통과시키기 위한 값
    localStorage.setItem('dumpit_pomodoro_focus', '1')
    localStorage.setItem('dumpit_pomodoro_break', '1')
    localStorage.setItem('dumpit_pomodoro_sets', '2')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    delete window.dumpitDesktop
  })

  it('집중 중에는 1초마다 줄어든다', async () => {
    render(<PomodoroTimer />)
    expect(clock()).toBe('01:00')

    await click('집중시작')
    await advance(3000)

    expect(clock()).toBe('00:57')
  })

  /**
   * 회귀 방지: 페이즈 전환은 setRunning(false) 직후 setRunning(true)를 같은 배치에서 실행해
   * running의 최종값이 변하지 않는다. 카운트다운 effect가 running에만 의존하면 재실행되지 않고,
   * 인터벌은 이미 정리된 뒤라 타이머가 멈춘 채로 남는다.
   */
  it('집중 → 휴식으로 넘어간 뒤에도 계속 줄어든다', async () => {
    render(<PomodoroTimer />)

    await click('집중시작')
    await advance(60_000)

    expect(clock()).toBe('01:00')

    await advance(5000)

    expect(clock()).toBe('00:55') // 멈춰 있으면 01:00 그대로다
  })

  it('휴식 → 집중으로 넘어간 뒤에도 계속 줄어든다', async () => {
    render(<PomodoroTimer />)

    await click('집중시작')
    await advance(60_000)
    await advance(60_000)

    expect(clock()).toBe('01:00')

    await advance(5000)

    expect(clock()).toBe('00:55')
  })

  it('일시정지하면 멈추고 재개하면 이어간다', async () => {
    render(<PomodoroTimer />)

    await click('집중시작')
    await advance(3000)
    await click('일시정지')

    const paused = clock()
    await advance(5000)
    expect(clock()).toBe(paused)

    await click('집중시작')
    await advance(2000)
    expect(clock()).toBe('00:55')
  })

  it('채움 위 상태·재개 조작만 모드별 전경 토큰을 사용한다', async () => {
    render(<PomodoroTimer />)

    const badge = screen.getByText('FOCUS')
    const start = screen.getByRole('button', { name: '집중시작' })
    expect(badge).toHaveStyle({ color: 'var(--on-pomo-focus)' })
    expect(start).toHaveStyle({ color: 'var(--on-pomo-focus)' })

    await click('집중시작')
    const pause = screen.getByRole('button', { name: '일시정지' })
    expect(pause).toHaveStyle({ background: 'var(--pomo-soft)' })
    expect(pause).toHaveClass('text-dark')

    await click('일시정지')
    expect(screen.getByRole('button', { name: '집중시작' }))
      .toHaveStyle({ color: 'var(--on-pomo-focus)' })
  })

  it('휴식 상태 배지와 시작 조작은 휴식 전경 토큰을 사용한다', async () => {
    render(<PomodoroTimer />)

    await click('집중시작')
    await advance(60_000)

    expect(screen.getByText('BREAK')).toHaveStyle({ color: 'var(--on-pomo-break)' })
    const pause = screen.getByRole('button', { name: '일시정지' })
    expect(pause).toHaveStyle({ background: 'var(--pomo-soft)' })
    expect(pause).toHaveClass('text-dark')
    await click('일시정지')
    expect(screen.getByRole('button', { name: '쉬기시작' }))
      .toHaveStyle({ color: 'var(--on-pomo-break)' })
  })

  it('데스크톱 위젯에는 기존 색상 payload만 전달한다', () => {
    const updatePomodoroState = vi.fn()
    window.dumpitDesktop = { updatePomodoroState }
    render(<PomodoroTimer />)

    const payload = updatePomodoroState.mock.calls.find(([state]) => state.active)?.[0]
    expect(Object.keys(payload.colors)).toEqual([
      'focus', 'break', 'ring', 'soft', 'bg', 'card', 'fg', 'sub', 'line', 'edge', 'chip',
      'shadowSm', 'onAccent',
    ])
  })

  it('위젯 열기와 설정은 평면 외관·아이콘 크기를 유지한 44px 히트 영역을 제공한다', () => {
    window.dumpitDesktop = { updatePomodoroState: vi.fn() }
    render(<PomodoroTimer />)

    const widgetButton = screen.getByRole('button', { name: '뽀모도로 위젯 열기' })
    const settingsButton = screen.getByRole('button', { name: '타이머 설정' })
    expect(widgetButton).toHaveClass('min-w-[44px]', 'min-h-[44px]')
    expect(settingsButton).toHaveClass('min-w-[44px]', 'min-h-[44px]')
    expect(widgetButton).not.toHaveClass('btn-retro', 'btn-refined')
    expect(settingsButton).not.toHaveClass('btn-retro', 'btn-refined')

    const widgetVisual = widgetButton.querySelector('span')
    expect(widgetVisual).toHaveClass('w-6', 'h-6', 'rounded-md', 'border-line', 'bg-card')
    expect(widgetVisual.querySelector('img')).toHaveClass('w-3.5', 'h-3.5')
    expect(settingsButton.querySelector('img')).toHaveClass('w-5', 'h-5')
  })

  it('세트 1이면 휴식 후 자동으로 다음 집중을 시작하지 않는다', async () => {
    localStorage.setItem('dumpit_pomodoro_sets', '1')
    render(<PomodoroTimer />)

    await click('집중시작')
    await advance(60_000) // 집중 끝 → 휴식(세트 1도 휴식은 있다)
    await advance(60_000)

    expect(clock()).toBe('01:00')
    expect(screen.getByRole('button', { name: '집중시작' })).toBeTruthy()

    await advance(5000)
    expect(clock()).toBe('01:00') // 멈춰 있어야 정상
  })
})
