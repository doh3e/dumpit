/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AiUsageBadge from './AiUsageBadge'

const usage = {
  used: 32,
  remaining: 68,
  limit: 100,
  resetAt: '2026-09-12T00:00:00+09:00',
}

describe('AiUsageBadge', () => {
  afterEach(cleanup)

  it('기본 card 변형의 기존 컨테이너와 기본 비용을 유지한다', () => {
    const { container } = render(<AiUsageBadge usage={usage} />)

    expect(container.firstChild).toHaveClass('rounded-lg', 'border-2', 'bg-card')
    expect(screen.getByText('32 / 100')).toBeInTheDocument()
    expect(screen.getByText(/이 작업은 1점을 사용해요/)).toBeInTheDocument()
  })

  it('inline 변형은 중첩 카드 없이 사용량과 잔여량과 전달된 비용을 구분한다', () => {
    const { container } = render(<AiUsageBadge usage={usage} cost={5} variant="inline" />)

    expect(container.firstChild).toHaveClass('ai-usage-inline')
    expect(container.firstChild).not.toHaveClass('rounded-lg', 'border-2', 'bg-card')
    expect(screen.getByText('사용 32 / 100')).toBeInTheDocument()
    expect(screen.getByText('잔여 68점')).toBeInTheDocument()
    expect(screen.getByText(/이 작업은 5점을 사용해요/)).toBeInTheDocument()
  })

  it.each([1, 4])('잔여 %s점은 모두 소진이 아니라 현재 작업의 사용량 부족으로 설명한다', (remaining) => {
    render(
      <AiUsageBadge
        usage={{ ...usage, used: 100 - remaining, remaining }}
        cost={5}
        variant="inline"
      />,
    )

    expect(screen.getByText('잔여 ' + remaining + '점')).toBeInTheDocument()
    expect(screen.getByText(/이 작업에 필요한 AI 사용량이 부족해요/)).toBeInTheDocument()
    expect(screen.queryByText(/모두 사용했어요/)).not.toBeInTheDocument()
  })
})
