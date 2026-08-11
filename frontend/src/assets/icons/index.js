// 크롬 아이콘 srcset 헬퍼 — 산출물은 scripts/gen_icon_sizes.py가 만든다.
// 원본(100px)을 브라우저가 12~24px로 축소하며 생기던 자글거림을 없애기 위해
// 표시 슬롯 × DPR별 사전 리사이즈본을 x-descriptor srcset으로 서빙한다.
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
 * cssPx는 클래스의 표시 크기(w-4=16)와 일치해야 하며, 슬롯을 새로 쓰면
 * gen_icon_sizes.py의 슬롯 목록에도 추가해 정확한 크기가 생성되게 할 것.
 */
export function iconProps(name, cssPx) {
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
