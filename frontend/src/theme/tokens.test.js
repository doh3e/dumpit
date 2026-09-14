import { readFileSync } from 'node:fs'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { contrastRatio, parseCssVars } from '../utils/contrast'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const blocks = parseCssVars(css)
const stylesheet = postcss.parse(css)
const root = blocks.get(':root')
const dark = blocks.get('[data-theme="dark"]')
const SKINS = ['ocean', 'lavender', 'sprout', 'galaxy', 'rose', 'wood', 'candy']
const TEXT_TOKENS = ['sub', 'accent-text', 'accent2-text', 'danger-text']

const THEMES = ['light', 'dark']
const CONTRASTS = ['normal', 'high']
const BACKGROUNDS = ['default', ...SKINS]
const CHROMES = ['default', ...SKINS]
const POMODOROS = ['default', ...SKINS]

function expectText(fg, bg, min, label) {
  expect(contrastRatio(fg, bg), `${label}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(min)
}

function declarationsFor(selector) {
  let declarations
  stylesheet.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      declarations = Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map(({ prop, value }) => [prop, value]),
      )
    }
  })
  expect(declarations, `${selector} 규칙`).toBeTruthy()
  return declarations
}

function selectorMatchesRoot(selector, attributes) {
  const attributeMatches = [...selector.matchAll(/\[([a-z0-9-]+)(?:="([^"]+)")?\]/gi)]
  const remainder = selector
    .replace(/:root/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim()
  if (remainder) return false
  return attributeMatches.every(([, name, value]) =>
    name in attributes && (value === undefined || attributes[name] === value)
  )
}

function resolvePalette({ background = 'default', chrome = 'default', pomodoro = 'default', theme = 'light', contrast = 'normal' }) {
  const attributes = {}
  if (background !== 'default') attributes['data-skin-bg'] = background
  if (chrome !== 'default') attributes['data-skin-chrome'] = chrome
  if (pomodoro !== 'default') attributes['data-skin-pomodoro'] = pomodoro
  if (theme === 'dark') attributes['data-theme'] = 'dark'
  if (contrast === 'high') attributes['data-contrast'] = 'high'

  const winners = new Map()
  let order = 0
  stylesheet.walkRules((rule) => {
    order += 1
    for (const selector of rule.selectors) {
      if (!selectorMatchesRoot(selector, attributes)) continue
      const specificity = (selector.match(/:root|\[[^\]]+\]/g) || []).length
      for (const declaration of rule.nodes.filter((node) => node.type === 'decl' && node.prop.startsWith('--'))) {
        const current = winners.get(declaration.prop)
        if (!current || specificity > current.specificity || (specificity === current.specificity && order >= current.order)) {
          winners.set(declaration.prop, { value: declaration.value, specificity, order })
        }
      }
    }
  })

  const resolve = (name, seen = new Set()) => {
    expect(seen.has(name), `${name} 순환 참조`).toBe(false)
    const entry = winners.get(`--${name}`)
    expect(entry, `--${name} 토큰 (${JSON.stringify(attributes)})`).toBeTruthy()
    const variable = /^var\(--([a-z0-9-]+)\)$/.exec(entry.value)
    return variable ? resolve(variable[1], new Set([...seen, name])) : entry.value.toUpperCase()
  }

  return { resolve }
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
  it('다크 고대비 위험 글자·경계는 기존 다크 의미색을 재사용하고 모든 스킨 card에서 4.5:1 이상이다', () => {
    expect(
      declarationsFor('[data-theme="dark"][data-contrast="high"]')['--danger-text'],
    ).toBe('var(--danger)')

    const palettes = [
      ['default', dark],
      ...SKINS.map((skin) => [skin, blocks.get(`[data-skin-bg="${skin}"][data-theme="dark"]`)]),
    ]
    for (const [name, palette] of palettes) {
      expectText(palette.danger ?? dark.danger, palette.card, 4.5, `${name} hc danger-text/card`)
    }
  })
  it('다크 스킨 + 고대비: 스킨 블록이 덮은 line/edge를 되돌리는 블록이 있다', () => {
    const hc = blocks.get('[data-theme="dark"][data-contrast="high"]')
    const skinHc = blocks.get('[data-skin-bg][data-theme="dark"][data-contrast="high"]')
    expect(skinHc, '[data-skin-bg][data-theme="dark"][data-contrast="high"] 블록').toBeTruthy()
    expect(skinHc.line).toBe(hc.line)
    expect(skinHc.edge).toBe(hc.edge)
  })
})

describe('포커스 링과 채움 위 글자', () => {
  it('포커스 링(--accent2-text)이 기본·스킨 bg·card 위에서 3:1 이상', () => {
    expectText(root['accent2-text'], root.bg, 3, 'ring/bg')
    expectText(root['accent2-text'], root.card, 3, 'ring/card')
    for (const skin of SKINS) {
      const s = blocks.get(`[data-skin-bg="${skin}"]`)
      expectText(s['accent2-text'], s.bg, 3, `${skin} ring/bg`)
      expectText(s['accent2-text'], s.card, 3, `${skin} ring/card`)
    }
  })
})

describe('실제 cascade 기반 버튼·마감 대비', () => {
  it('8 BG × 8 CHROME × light/dark × normal/high에서 크롬 글자가 4.5:1 이상', () => {
    const failures = []
    for (const background of BACKGROUNDS) {
      for (const chrome of CHROMES) {
        for (const theme of THEMES) {
          for (const contrast of CONTRASTS) {
            const { resolve } = resolvePalette({ background, chrome, theme, contrast })
            for (const foreground of ['fg', 'sub']) {
              const ratio = contrastRatio(resolve(foreground), resolve('chrome-bg'))
              if (ratio < 4.5) {
                failures.push(`${background}/${chrome}/${theme}/${contrast} ${foreground}=${ratio.toFixed(6)}`)
              }
            }
          }
        }
      }
    }

    expect(failures).toEqual([])
  })

  it('중립 버튼 resting/hover/active/focus 글자가 기본·스킨 표면에서 4.5:1 이상', () => {
    const hover = declarationsFor(
      '.btn-refined:not(.btn-refined-primary):not(.btn-refined-danger):not(.btn-refined-selected):not(:disabled):hover',
    )
    const active = declarationsFor(
      '.btn-refined:not(.btn-refined-primary):not(.btn-refined-danger):not(.btn-refined-selected):not(:disabled):active',
    )
    const interactiveForeground = hover.color === 'var(--fg)' && active.color === 'var(--fg)'
      ? 'fg'
      : 'sub'

    for (const background of BACKGROUNDS) {
      for (const theme of THEMES) {
        for (const contrast of CONTRASTS) {
          const { resolve } = resolvePalette({ background, theme, contrast })
          const context = `${background}/${theme}/${contrast}`
          expectText(resolve('sub'), resolve('card'), 4.5, `${context} resting`)
          expectText(resolve(interactiveForeground), resolve('chip'), 4.5, `${context} hover`)
          expectText(resolve(interactiveForeground), resolve('chip'), 4.5, `${context} active`)
          expectText(resolve('sub'), resolve('card'), 4.5, `${context} focus`)
          expectText(resolve('accent2-text'), resolve('card'), 3, `${context} focus ring`)
        }
      }
    }
  })

  it('마감 글자가 실제 bg/card/chip 표면에서 4.5:1 이상', () => {
    for (const background of BACKGROUNDS) {
      for (const theme of THEMES) {
        for (const contrast of CONTRASTS) {
          const { resolve } = resolvePalette({ background, theme, contrast })
          for (const surface of ['bg', 'card', 'chip']) {
            expectText(
              resolve('warn-text'),
              resolve(surface),
              4.5,
              `${background}/${theme}/${contrast} warn-text/${surface}`,
            )
          }
        }
      }
    }
  })
})

describe('독립 뽀모도로 채움 전경', () => {
  it('일반 on-accent를 바꾸지 않고 POMO 스킨마다 전용 전경을 선언한다', () => {
    expect(root['on-accent']).toBe('#FFFBF0')
    expect(dark['on-accent']).toBe('#241E14')
    for (const pomodoro of SKINS) {
      const light = declarationsFor(`[data-skin-pomodoro="${pomodoro}"]`)
      const darkPomo = declarationsFor(`[data-skin-pomodoro="${pomodoro}"][data-theme="dark"]`)
      expect(light['--on-pomo-focus']).toBeTruthy()
      expect(light['--on-pomo-break']).toBeTruthy()
      expect(darkPomo['--on-pomo-focus']).toBeTruthy()
      expect(darkPomo['--on-pomo-break']).toBeTruthy()
      expect(light['--on-accent']).toBeUndefined()
      expect(darkPomo['--on-accent']).toBeUndefined()
    }
  })

  it('기존 대응 스킨 전경이 4.5:1을 충족하면 그대로 보존한다', () => {
    for (const pomodoro of POMODOROS) {
      for (const theme of THEMES) {
        const { resolve } = resolvePalette({
          background: pomodoro,
          pomodoro,
          theme,
        })
        const preferred = resolve('on-accent')
        for (const phase of ['focus', 'break']) {
          if (contrastRatio(preferred, resolve(`pomo-${phase}`)) >= 4.5) {
            expect(resolve(`on-pomo-${phase}`), `${pomodoro}/${theme}/${phase}`)
              .toBe(preferred)
          }
        }
      }
    }
  })

  it('8 BG × 8 POMO × light/dark × normal/high에서 채움과 전경이 4.5:1 이상', () => {
    for (const background of BACKGROUNDS) {
      for (const pomodoro of POMODOROS) {
        for (const theme of THEMES) {
          for (const contrast of CONTRASTS) {
            const { resolve } = resolvePalette({ background, pomodoro, theme, contrast })
            const context = `${background}/${pomodoro}/${theme}/${contrast}`
            expectText(resolve('on-pomo-focus'), resolve('pomo-focus'), 4.5, `${context} focus`)
            expectText(resolve('on-pomo-break'), resolve('pomo-break'), 4.5, `${context} break`)
          }
        }
      }
    }
  })
})

describe('스킨 + 고대비(라이트)', () => {
  for (const skin of SKINS) {
    it(`${skin}: 스킨 고대비 글자 7:1, 채움 위 크림 7:1`, () => {
      const s = blocks.get(`[data-skin-bg="${skin}"]`)
      const hc = blocks.get(`[data-skin-bg="${skin}"][data-contrast="high"]`)
      expect(hc, `[data-skin-bg="${skin}"][data-contrast="high"] 블록`).toBeTruthy()
      expectText(hc['accent-text'], s.bg, 7, `${skin} hc accent-text`)
      expectText(hc['accent2-text'], s.bg, 7, `${skin} hc accent2-text`)
      expectText(s['on-accent'], hc['accent-fill'], 7, `${skin} hc on-accent/accent-fill`)
      expectText(s['on-accent'], hc['accent2-fill'], 7, `${skin} hc on-accent/accent2-fill`)
    })
  }
})
