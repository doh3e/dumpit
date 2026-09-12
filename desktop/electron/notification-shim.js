(() => {
  if (!window.dumpitDesktop) return

  let nextNotificationId = 1
  const notifications = new Map()

  window.dumpitDesktop.onNotificationClick(({ id, clickUrl }) => {
    const notification = notifications.get(id)
    if (notification?.cleanupTimer) {
      window.clearTimeout(notification.cleanupTimer)
    }
    if (notification?.onclick) {
      notification.onclick({ target: notification })
    } else if (clickUrl) {
      window.location.assign(clickUrl)
    }
    notifications.delete(id)
  })

  class DesktopNotification {
    static get permission() {
      return 'granted'
    }

    static requestPermission(callback) {
      if (typeof callback === 'function') callback('granted')
      return Promise.resolve('granted')
    }

    constructor(title, options = {}) {
      this.title = title
      this.options = options
      this.onclick = null
      this.id = String(nextNotificationId++)
      notifications.set(this.id, this)
      this.cleanupTimer = window.setTimeout(() => {
        notifications.delete(this.id)
      }, 10 * 60 * 1000)

      window.dumpitDesktop.notify({
        id: this.id,
        title,
        body: options.body,
        silent: options.silent,
        clickUrl: options.data?.url,
      }).catch(() => {
        window.clearTimeout(this.cleanupTimer)
        notifications.delete(this.id)
      })
    }

    close() {
      window.clearTimeout(this.cleanupTimer)
      notifications.delete(this.id)
    }
  }

  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: DesktopNotification,
  })

  if (window.ServiceWorkerRegistration?.prototype?.showNotification) {
    const originalShowNotification = window.ServiceWorkerRegistration.prototype.showNotification
    window.ServiceWorkerRegistration.prototype.showNotification = function showNotification(title, options = {}) {
      return window.dumpitDesktop.notify({
        id: String(nextNotificationId++),
        title,
        body: options.body,
        silent: options.silent,
        clickUrl: options.data?.url,
      }).catch(() => originalShowNotification.call(this, title, options))
    }
  }
})()
