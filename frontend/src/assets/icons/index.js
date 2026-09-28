import setting from './setting.svg'
import deadline16 from './deadline-16.svg'
import deadline20 from './deadline-20.svg'

// 래스터 아이콘은 gen_icon_sizes.py의 표시 슬롯 × DPR별 산출물을 srcset으로 서빙한다.
const files = import.meta.glob('./*.png', { eager: true, query: '?url', import: 'default' })

const BY_NAME = {}
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/^\.\/([a-z]+)_(\d+)\.png$/)
  if (!m) continue
  const entry = { size: Number(m[2]), url }
  ;(BY_NAME[m[1]] ??= []).push(entry)
}
for (const list of Object.values(BY_NAME)) list.sort((a, b) => a.size - b.size)

/**
 * <img {...iconProps('coin', 16)} alt="..." className="w-4 h-4 ..." /> 형태로 사용.
 * cssPx는 클래스의 표시 크기(w-4=16)와 일치해야 하며, PNG 슬롯을 새로 쓰면
 * gen_icon_sizes.py의 슬롯 목록에도 추가해 정확한 크기가 생성되게 할 것.
 */
export function iconProps(name, cssPx) {
  if (name === 'setting') return { src: setting, width: cssPx, height: cssPx }
  if (name === 'deadline') {
    return { src: cssPx <= 16 ? deadline16 : deadline20, width: cssPx, height: cssPx }
  }

  const list = BY_NAME[name]
  if (!list) throw new Error(`unknown icon: ${name}`)
  const base = list.find((f) => f.size >= cssPx) ?? list[list.length - 1]
  return {
    src: base.url,
    srcSet: list.map(({ size, url }) => `${url} ${size / cssPx}x`).join(', '),
    width: cssPx,
    height: cssPx,
  }
}
