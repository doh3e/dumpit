import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseCssVars } from '../utils/contrast'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const blocks = parseCssVars(css)
const root = blocks.get(':root')
const dark = blocks.get('[data-theme="dark"]')
const SKINS = ['ocean', 'lavender', 'sprout', 'galaxy', 'rose', 'wood', 'candy']
const TEXT_TOKENS = ['sub', 'accent-text', 'accent2-text', 'danger-text']

function expectText(fg, bg, min, label) {
  expect(contrastRatio(fg, bg), `${label}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min)
}

describe('라이트 기본 팔레트', () => {
  it('글자 토큰이 bg·card 위에서 4.5:1 이상', () => {
    for (const t of TEXT_TOKENS) {
      expectText(root[t], root.bg, 4.5, t)
      expectText(root[t], root.card, 4.5, t)
    }
  })
  it('크림 글자가 채움 토큰 위에서 4.5:1 이상', () => {
    expectText(root['on-accent'], root['accent-fill'], 4.5, 'on-accent/accent-fill')
    expectText(root['on-accent'], root['accent2-fill'], 4.5, 'on-accent/accent2-fill')
  })
  it('앰버·골드 채움 위 글자가 4.5:1 이상 (라이트·다크)', () => {
    expectText(root['on-warn'], root.warn, 4.5, 'on-warn/warn')
    expectText(root['on-warn'], root.starlight, 4.5, 'on-warn/starlight')
    expectText(dark['on-warn'], dark.warn, 4.5, 'dark on-warn/warn')
    expectText(dark['on-warn'], dark.starlight, 4.5, 'dark on-warn/starlight')
  })
  it('본문 색은 유지된다', () => {
    expect(root.fg).toBe('#33271E')
    expect(root.accent).toBe('#D95F52')
  })
})

describe('다크 기본 팔레트', () => {
  it('글자 토큰이 card 위에서 4.5:1 이상', () => {
    for (const t of TEXT_TOKENS) expectText(dark[t], dark.card, 4.5, `dark ${t}`)
    expectText(dark['on-accent'], dark['accent-fill'], 4.5, 'dark on-accent/accent-fill')
    expectText(dark['on-accent'], dark['accent2-fill'], 4.5, 'dark on-accent/accent2-fill')
  })
})

describe('상점 스킨(라이트)', () => {
  for (const skin of SKINS) {
    it(`${skin}: 스킨 글자·채움 토큰과 기본 sub가 스킨 bg 위에서 4.5:1 이상`, () => {
      const s = blocks.get(`[data-skin-bg="${skin}"]`)
      expect(s, `[data-skin-bg="${skin}"] 블록`).toBeTruthy()
      expectText(s['accent-text'], s.bg, 4.5, `${skin} accent-text`)
      expectText(s['accent2-text'], s.bg, 4.5, `${skin} accent2-text`)
      expectText(s['on-accent'], s['accent-fill'], 4.5, `${skin} on-accent/accent-fill`)
      expectText(s['on-accent'], s['accent2-fill'], 4.5, `${skin} on-accent/accent2-fill`)
      expectText(root.sub, s.bg, 4.5, `${skin} sub`)
    })
  }
})

describe('고대비 모드', () => {
  it('라이트 고대비: 글자 7:1, 경계선 3:1', () => {
    const hc = blocks.get(':root[data-contrast="high"]')
    expect(hc).toBeTruthy()
    expectText(hc.fg, root.bg, 7, 'hc fg')
    expectText(hc.sub, root.bg, 7, 'hc sub')
    expectText(hc['accent-text'], root.bg, 7, 'hc accent-text')
    expectText(hc['accent2-text'], root.bg, 7, 'hc accent2-text')
    expectText(hc.line, root.bg, 3, 'hc line')
    expectText(root['on-accent'], hc['accent-fill'], 7, 'hc on-accent/accent-fill')
  })
  it('다크 고대비: 글자 7:1, 경계선 3:1', () => {
    const hc = blocks.get('[data-theme="dark"][data-contrast="high"]')
    expect(hc).toBeTruthy()
    expectText(hc.fg, dark.card, 7, 'hc dark fg')
    expectText(hc.sub, dark.card, 7, 'hc dark sub')
    expectText(hc.line, dark.card, 3, 'hc dark line')
  })
})
