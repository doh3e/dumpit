const NOTIFICATION_SW_PATH = '/notification-sw.js'

let registrationPromise

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return window.Notification.permission
}

export function registerNotificationServiceWorker() {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !window.isSecureContext
  ) {
    return Promise.resolve(null)
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .getRegistration('/')
      .then((registration) => registration || navigator.serviceWorker.register(NOTIFICATION_SW_PATH, { scope: '/' }))
      .catch(() => null)
  }

  return registrationPromise
}

async function getNotificationRegistration() {
  const registration = await registerNotificationServiceWorker()
  if (!registration) return null
  if (registration.active) return registration

  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => window.setTimeout(() => resolve(registration.active ? registration : null), 1500)),
    ])
  } catch {
    return null
  }
}

export async function showBrowserNotification(title, options = {}, clickUrl) {
  if (getNotificationPermission() !== 'granted') return false

  const notificationOptions = clickUrl
    ? { ...options, data: { ...(options.data || {}), url: clickUrl } }
    : options

  const registration = await getNotificationRegistration()
  if (registration?.showNotification) {
    await registration.showNotification(title, notificationOptions)
    return true
  }

  try {
    const notification = new window.Notification(title, options)
    if (clickUrl) {
      notification.onclick = () => {
        window.focus()
        window.location.assign(clickUrl)
        notification.close()
      }
    }
    return true
  } catch {
    return false
  }
}
