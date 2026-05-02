import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './sentry.js'
import './index.css'
import App from './App.jsx'
import { registerNotificationServiceWorker } from './utils/notifications.js'

registerNotificationServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
