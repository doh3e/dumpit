function channel(c) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA)
  const lb = relativeLuminance(hexB)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// index.css의 `selector { --name:#HEX; ... }` 블록만 추출한다. 중첩 블록(@layer, @media)은 다루지 않는다.
export function parseCssVars(cssText) {
  const out = new Map()
  const blockRe = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = blockRe.exec(cssText)) !== null) {
    const selector = m[1].trim().split('\n').pop().trim()
    const body = m[2]
    const vars = {}
    const varRe = /--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g
    let v
    while ((v = varRe.exec(body)) !== null) vars[v[1]] = v[2].toUpperCase()
    if (Object.keys(vars).length === 0) continue
    out.set(selector, { ...(out.get(selector) || {}), ...vars })
  }
  return out
}
