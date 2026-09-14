export const TOAST_EVENT = 'dumpit:toast'

export function notifyToast(message, type = 'error') {
  if (!message || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type } }))
}
