import { createContext, useContext, useEffect, useRef, useState } from 'react'

const ToastContext = createContext(null)
const TOAST_EVENT = 'dumpit:toast'

export function notifyToast(message, type = 'error') {
  if (!message || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type } }))
}

const SUCCESS_MS = 3200

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = (message, type = 'error') => {
    if (!message) return
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setToast({ id: Date.now(), message, type })
    // 오류는 사용자가 닫을 때까지 유지 — 덤벙대는 사용자가 실패를 놓치지 않게(스펙 5.1)
    if (type === 'success') timerRef.current = window.setTimeout(() => setToast(null), SUCCESS_MS)
  }

  useEffect(() => {
    const handler = (event) => showToast(event.detail?.message, event.detail?.type)
    window.addEventListener(TOAST_EVENT, handler)
    return () => {
      window.removeEventListener(TOAST_EVENT, handler)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const isError = toast?.type !== 'success'

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed left-1/2 top-4 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            className={`rounded-xl px-4 py-3 bg-card shadow-retro flex items-center gap-3 ${isError ? 'text-primary' : 'text-dark'}`}
            style={{ border: `1.5px solid ${isError ? 'var(--accent)' : 'var(--accent2)'}` }}
          >
            <p className="text-sm font-bold flex-1">{toast.message}</p>
            {isError && (
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="닫기"
                className="w-7 h-7 shrink-0 rounded-lg border border-line font-dungeon text-dark text-sm hover:bg-chip"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
