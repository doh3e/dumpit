import { describe, expect, it } from 'vitest'
import { iconProps } from './index'
import setting from './setting.svg'
import deadline16 from './deadline-16.svg'
import deadline20 from './deadline-20.svg'

describe('iconProps', () => {
  it.each([
    ['setting', 20, setting],
    ['deadline', 12, deadline16],
    ['deadline', 16, deadline16],
    ['deadline', 17, deadline20],
    ['deadline', 20, deadline20],
  ])('%s %ipx는 슬롯에 맞는 SVG만 반환한다', (name, size, src) => {
    const props = iconProps(name, size)

    expect(props.src).toBe(src)
    expect(props).not.toHaveProperty('srcSet')
    expect(props.width).toBe(size)
    expect(props.height).toBe(size)
  })

  it('기존 PNG 아이콘은 슬롯에 맞는 소스와 모든 DPR 후보를 유지한다', () => {
    const props = iconProps('coin', 16)

    expect(props.src).toMatch(/\/coin_16\.png(?:\?|$)/)
    expect(props.width).toBe(16)
    expect(props.height).toBe(16)
    expect(props.srcSet.split(', ').map((entry) => {
      const [url, density] = entry.split(' ')
      return [url.split('?')[0].split('/').at(-1), density]
    })).toEqual([
      ['coin_12.png', '0.75x'],
      ['coin_15.png', '0.9375x'],
      ['coin_16.png', '1x'],
      ['coin_18.png', '1.125x'],
      ['coin_20.png', '1.25x'],
      ['coin_24.png', '1.5x'],
      ['coin_25.png', '1.5625x'],
      ['coin_30.png', '1.875x'],
      ['coin_32.png', '2x'],
      ['coin_36.png', '2.25x'],
      ['coin_40.png', '2.5x'],
      ['coin_48.png', '3x'],
      ['coin_60.png', '3.75x'],
      ['coin_72.png', '4.5x'],
    ])
  })

  it('PNG 후보보다 큰 슬롯은 가장 큰 소스를 사용한다', () => {
    expect(iconProps('coin', 80)).toMatchObject({
      src: expect.stringMatching(/\/coin_72\.png(?:\?|$)/),
      width: 80,
      height: 80,
    })
  })

  it('알 수 없는 아이콘은 오류를 반환한다', () => {
    expect(() => iconProps('missing', 20)).toThrow('unknown icon: missing')
  })
})
