import { createContext, useContext, useEffect, useRef, useState } from 'react'

const ToastContext = createContext(null)
const TOAST_EVENT = 'dumpit:toast'

export function notifyToast(message, type = 'error') {
  if (!message || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type } }))
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = (message, type = 'error') => {
    if (!message) return
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setToast({ message, type })
    timerRef.current = window.setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => {
    const handler = (event) => showToast(event.detail?.message, event.detail?.type)
    window.addEventListener(TOAST_EVENT, handler)
    return () => {
      window.removeEventListener(TOAST_EVENT, handler)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed left-1/2 top-4 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className={`rounded-lg border-2 px-4 py-3 shadow-kitschy ${
            toast.type === 'success'
              ? 'border-secondary bg-green-50 text-green-700'
              : 'border-primary bg-red-50 text-primary'
          }`}>
            <p className="text-sm font-black">{toast.message}</p>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
