import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { applyMarkdownAction } from '../utils/markdownActions'

const TOOLBAR = [
  { action: 'h1', label: 'H1', title: '제목' },
  { action: 'h2', label: 'H2', title: '중제목' },
  { action: 'h3', label: 'H3', title: '소제목' },
  { action: 'bold', label: 'B', title: '굵게', className: 'font-black' },
  { action: 'italic', label: 'I', title: '기울임', className: 'italic' },
  { action: 'strike', label: 'S', title: '취소선', className: 'line-through' },
  { action: 'code', label: '<>', title: '코드' },
  { action: 'codeblock', label: '[ ]', title: '코드블록' },
  { action: 'ul', label: '•—', title: '목록' },
]

export function MarkdownView({ children }) {
  return (
    <div className="md-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

export default function MarkdownEditor({ value, onChange, maxLength = 5000, rows = 12, placeholder, defaultMode = 'write' }) {
  const [previewing, setPreviewing] = useState(defaultMode === 'preview')
  const textareaRef = useRef(null)

  const runAction = (action) => {
    const el = textareaRef.current
    if (!el) return
    const result = applyMarkdownAction(value, el.selectionStart, el.selectionEnd, action, maxLength)
    if (!result) return
    onChange(result.text)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.selStart, result.selEnd)
    })
  }

  return (
    <div className="rounded-lg border border-line bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
        {[{ key: false, label: '쓰기' }, { key: true, label: '미리보기' }].map(({ key, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => setPreviewing(key)}
            className={`rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-black transition-colors ${
              previewing === key ? 'border-edge bg-chip text-dark' : 'border-line text-sub hover:border-edge'
            }`}
          >
            {label}
          </button>
        ))}
        {!previewing && (
          <div className="ml-auto flex flex-wrap items-center gap-0.5">
            {TOOLBAR.map(({ action, label, title, className = '' }) => (
              <button
                key={action}
                type="button"
                title={title}
                aria-label={title}
                onMouseDown={(e) => e.preventDefault() /* 텍스트에어리어 포커스·선택 유지 */}
                onClick={() => runAction(action)}
                className={`min-w-6 rounded px-1 py-0.5 text-[0.6875rem] font-bold text-sub hover:bg-chip hover:text-dark ${className}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {previewing ? (
        <div className="min-h-32 px-3 py-2">
          {value.trim() ? (
            <MarkdownView>{value}</MarkdownView>
          ) : (
            <p className="text-sm font-semibold text-sub">아직 내용이 없어요. 쓰기 탭에서 작성해보세요.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-3 py-2 text-sm font-semibold leading-relaxed text-dark outline-none placeholder:text-sub"
        />
      )}
      <p className="border-t border-line px-3 py-1 text-right text-[0.625rem] font-bold text-sub">
        {value.length} / {maxLength}자 · 마크다운 지원
      </p>
    </div>
  )
}
