import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const stylesheet = postcss.parse(css)

function resolveMaxLengthPx(value, remSizePx) {
  const match = /^max\((\d*\.?\d+)px, (\d*\.?\d+)rem\)$/.exec(value)
  expect(match, `${value}는 px 하한을 둔 max() 길이`).toBeTruthy()
  return Math.max(Number(match[1]), Number(match[2]) * remSizePx)
}

function ruleFor(selector, ancestor = () => true) {
  let match
  stylesheet.walkRules((rule) => {
    if (!match && rule.selectors.includes(selector) && ancestor(rule.parent)) match = rule
  })
  expect(match, `${selector} 규칙`).toBeTruthy()

  const declarations = Object.fromEntries(
    match.nodes
      .filter((node) => node.type === 'decl')
      .map(({ prop, value }) => [prop, value]),
  )
  const appliedUtilities = match.nodes
    .filter((node) => node.type === 'atrule' && node.name === 'apply')
    .map(({ params }) => params)

  return { appliedUtilities, declarations }
}

describe('정돈된 레트로 공통 변형', () => {
  it('버튼은 44px 조작 영역과 중립 의미 토큰을 사용한다', () => {
    const { appliedUtilities, declarations } = ruleFor('.btn-refined')

    expect(appliedUtilities).toContain(
      'font-dungeon text-sm inline-flex items-center justify-center gap-2',
    )
    expect(resolveMaxLengthPx(declarations['min-height'], 14.4)).toBe(44)
    expect(resolveMaxLengthPx(declarations['min-width'], 14.4)).toBe(44)
    expect(declarations).toMatchObject({
      padding: '.625rem 1rem',
      border: '1px solid var(--sub)',
      'border-radius': '.5rem',
      background: 'var(--card)',
      color: 'var(--fg)',
      'box-shadow': 'none',
      'white-space': 'normal',
      transition: 'background-color 80ms ease, border-color 80ms ease',
    })
  })

  it('주·텍스트 버튼과 표면·결과 행의 시각 역할을 분리한다', () => {
    expect(ruleFor('.btn-refined-primary').declarations).toMatchObject({
      background: 'var(--accent-fill)',
      color: 'var(--on-accent)',
      'border-color': 'var(--accent-fill)',
    })
    expect(ruleFor('.btn-refined-text').declarations).toMatchObject({
      background: 'transparent',
      'border-color': 'transparent',
    })
    expect(ruleFor('.surface-refined').declarations).toMatchObject({
      background: 'var(--card)',
      'border-radius': '.75rem',
      'box-shadow': 'none',
    })
    expect(ruleFor('.result-row-refined').declarations).toMatchObject({
      background: 'var(--card)',
      'border-bottom': '1px solid var(--line)',
      'box-shadow': 'none',
      'overflow-wrap': 'anywhere',
    })
  })

  it('Dialog의 refined 표면도 기존 패널의 정렬·높이·스크롤 계약을 유지한다', () => {
    expect(ruleFor('.dialog-retro > .surface-refined').declarations).toMatchObject({
      margin: '0 auto',
      'max-height': '90vh',
      'overflow-y': 'auto',
    })
  })

  it('위험·선택 버튼과 페이지 제목은 각각의 의미 토큰과 타이포그래피를 사용한다', () => {
    expect(ruleFor('.btn-refined-danger').declarations).toMatchObject({
      color: 'var(--danger-text)',
      'border-color': 'var(--danger-text)',
    })
    expect(ruleFor('.btn-refined-selected').declarations).toMatchObject({
      background: 'var(--chip)',
      'border-color': 'var(--fg)',
    })
    expect(ruleFor('.page-refined-heading').appliedUtilities).toContain(
      'font-galmuri text-2xl font-bold text-dark',
    )
  })

  it('버튼 상호작용은 토큰과 비활성 상태를 유지한다', () => {
    const neutralHover = ruleFor(
      '.btn-refined:not(.btn-refined-primary):not(.btn-refined-danger):not(.btn-refined-selected):not(:disabled):hover',
    )
    const neutralActive = ruleFor(
      '.btn-refined:not(.btn-refined-primary):not(.btn-refined-danger):not(.btn-refined-selected):not(:disabled):active',
    )
    expect(neutralHover.declarations.background).toBe('var(--chip)')
    expect(neutralActive.declarations.background).toBe('var(--chip)')
    for (const selector of [
      '.btn-refined-danger:not(:disabled):hover',
      '.btn-refined-danger:not(:disabled):active',
      '.btn-refined-selected:not(:disabled):hover',
      '.btn-refined-selected:not(:disabled):active',
    ]) {
      expect(ruleFor(selector).declarations['box-shadow']).toBe(
        'inset 0 0 0 1px currentColor',
      )
    }
    expect(ruleFor('.btn-refined-primary:not(:disabled):hover').declarations['box-shadow']).toBe(
      'inset 0 0 0 1px var(--on-accent)',
    )
    expect(ruleFor('.btn-refined-primary:not(:disabled):active').declarations['box-shadow']).toBe(
      'inset 0 0 0 1px var(--on-accent)',
    )
    expect(ruleFor('.btn-refined:disabled').declarations).toMatchObject({
      cursor: 'not-allowed',
      opacity: '.5',
    })
  })

  it('입력은 본문 타이포그래피, 44px 높이, 내용 경계 토큰을 사용한다', () => {
    const { appliedUtilities, declarations } = ruleFor('.input-refined')

    expect(appliedUtilities).toContain('font-sans text-base leading-6')
    expect(resolveMaxLengthPx(declarations['min-height'], 14.4)).toBe(44)
    expect(declarations).toMatchObject({
      width: '100%',
      padding: '.75rem',
      border: '1px solid var(--sub)',
      'border-radius': '.5rem',
      background: 'var(--card)',
      color: 'var(--fg)',
    })
  })

  it('입력 예시 문구는 전용 선택자에서 본문 의미 토큰과 불투명도를 고정한다', () => {
    expect(ruleFor('.input-refined::placeholder').declarations).toMatchObject({
      color: 'var(--fg)',
      opacity: '1',
    })
  })

  it('포커스와 굵은 글자 접근성 정책을 새 조작에도 적용한다', () => {
    for (const selector of ['.btn-refined:focus-visible', '.input-refined:focus-visible']) {
      expect(ruleFor(selector).declarations).toMatchObject({
        outline: 'var(--focus-w) solid var(--accent2-text)',
        'outline-offset': '2px',
      })
    }

    const boldRule = ruleFor(':root[data-bold-text="1"] .btn-refined')
    expect(boldRule.declarations).toMatchObject({
      'font-family': "'Galmuri11', 'Pretendard Variable', Pretendard, sans-serif",
      'font-weight': '700',
    })
  })

  it('reduced motion에서는 새 변형의 전환을 제거한다', () => {
    const reducedMotion = (parent) =>
      parent.type === 'atrule' &&
      parent.name === 'media' &&
      parent.params === '(prefers-reduced-motion: reduce)'

    expect(ruleFor('.btn-refined', reducedMotion).declarations.transition).toBe('none')
    expect(ruleFor('.input-refined', reducedMotion).declarations.transition).toBe('none')
  })
})
