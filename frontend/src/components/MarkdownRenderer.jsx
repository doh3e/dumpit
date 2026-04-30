function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderInline(raw) {
  let text = escapeHtml(raw)
  const code = []
  text = text.replace(/`([^`]+)`/g, (_, value) => {
    code.push(`<code class="rounded bg-dark/10 px-1 py-0.5 font-mono text-[0.9em]">${value}</code>`)
    return `@@CODE${code.length - 1}@@`
  })
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-primary underline">$1</a>')
  return text.replace(/@@CODE(\d+)@@/g, (_, idx) => code[Number(idx)] ?? '')
}

export default function MarkdownRenderer({ content = '', className = '' }) {
  const lines = String(content || '').split(/\r?\n/)
  const html = []
  let listOpen = false

  const closeList = () => {
    if (listOpen) {
      html.push('</ul>')
      listOpen = false
    }
  }

  for (const line of lines) {
    if (!line.trim()) {
      closeList()
      html.push('<div class="h-3"></div>')
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      closeList()
      const level = heading[1].length
      const size = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'
      html.push(`<h${level} class="mt-3 first:mt-0 ${size} font-black text-dark">${renderInline(heading[2])}</h${level}>`)
      continue
    }

    const item = /^\s*[-*]\s+(.+)$/.exec(line)
    if (item) {
      if (!listOpen) {
        html.push('<ul class="my-2 list-disc space-y-1 pl-5">')
        listOpen = true
      }
      html.push(`<li>${renderInline(item[1])}</li>`)
      continue
    }

    const quote = /^>\s+(.+)$/.exec(line)
    if (quote) {
      closeList()
      html.push(`<blockquote class="my-2 border-l-4 border-primary/50 bg-accent px-3 py-2 text-dark/70">${renderInline(quote[1])}</blockquote>`)
      continue
    }

    closeList()
    html.push(`<p>${renderInline(line)}</p>`)
  }

  closeList()

  return (
    <div
      className={`prose prose-sm max-w-none whitespace-normal text-sm font-semibold leading-relaxed text-dark/75 ${className}`}
      dangerouslySetInnerHTML={{ __html: html.join('') }}
    />
  )
}
