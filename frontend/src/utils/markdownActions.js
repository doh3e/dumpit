// 텍스트에어리어 선택 영역에 마크다운 문법을 삽입한다. 결과가 maxLength를 넘으면 null(no-op).
const INLINE = { bold: '**', italic: '*', strike: '~~', code: '`' }
const HEADING = { h1: '# ', h2: '## ', h3: '### ' }

export function applyMarkdownAction(text, selStart, selEnd, action, maxLength = Infinity) {
  let result
  if (INLINE[action]) {
    const m = INLINE[action]
    const next = text.slice(0, selStart) + m + text.slice(selStart, selEnd) + m + text.slice(selEnd)
    result = { text: next, selStart: selStart + m.length, selEnd: selEnd + m.length }
  } else if (HEADING[action]) {
    const lineStart = text.lastIndexOf('\n', selStart - 1) + 1
    const lineEndIdx = text.indexOf('\n', lineStart)
    const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx
    const line = text.slice(lineStart, lineEnd).replace(/^#{1,6} /, '')
    const nextLine = HEADING[action] + line
    const next = text.slice(0, lineStart) + nextLine + text.slice(lineEnd)
    const caret = lineStart + nextLine.length
    result = { text: next, selStart: caret, selEnd: caret }
  } else if (action === 'ul') {
    const blockStart = text.lastIndexOf('\n', selStart - 1) + 1
    const blockEndIdx = text.indexOf('\n', Math.max(selEnd - 1, blockStart))
    const blockEnd = blockEndIdx === -1 ? text.length : blockEndIdx
    const block = text.slice(blockStart, blockEnd)
    const nextBlock = block.split('\n').map((l) => (l.startsWith('- ') ? l : `- ${l}`)).join('\n')
    const next = text.slice(0, blockStart) + nextBlock + text.slice(blockEnd)
    result = { text: next, selStart: blockStart, selEnd: blockStart + nextBlock.length }
  } else if (action === 'codeblock') {
    const selected = text.slice(selStart, selEnd)
    const insert = `\`\`\`\n${selected}\n\`\`\``
    const next = text.slice(0, selStart) + insert + text.slice(selEnd)
    result = { text: next, selStart: selStart + 4, selEnd: selStart + 4 + selected.length }
  } else {
    return null
  }
  if (result.text.length > maxLength) return null
  return result
}
