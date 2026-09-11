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

export default function MarkdownEditor({ value, onChange, maxLength = 5000, rows = 12, placeholder, defaultMode = 'write', ariaLabel }) {
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
    <div className="surface-refined border border-line">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
        {[{ key: false, label: '쓰기' }, { key: true, label: '미리보기' }].map(({ key, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => setPreviewing(key)}
            aria-pressed={previewing === key}
            className={`btn-refined !rounded-full !px-3 ${previewing === key ? 'btn-refined-selected' : 'btn-refined-text'}`}
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
                className={`btn-refined btn-refined-text !p-2 ${className}`}
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
          aria-label={ariaLabel ?? '내용'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          className="input-refined !resize-none !rounded-none !border-0"
        />
      )}
      <p className="border-t border-line px-3 py-1 text-right text-[0.625rem] font-bold text-sub">
        {value.length} / {maxLength}자 · 마크다운 지원
      </p>
    </div>
  )
}
