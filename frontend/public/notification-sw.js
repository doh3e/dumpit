self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data?.url || '/dashboard'
  event.notification.close()

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })

    for (const client of windowClients) {
      const clientUrl = new URL(client.url)
      if (clientUrl.origin === self.location.origin && 'focus' in client) {
        await client.focus()
        if ('navigate' in client) {
          await client.navigate(url)
        }
        return
      }
    }

    if (clients.openWindow) {
      await clients.openWindow(url)
    }
  })())
})
