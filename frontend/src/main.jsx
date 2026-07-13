import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import App from './App.jsx'
import { applyCachedSkins } from './shop/applySkins.js'
import { registerNotificationServiceWorker } from './utils/notifications.js'

applyCachedSkins()
registerNotificationServiceWorker()

// Sentry는 첫 페인트를 막지 않도록 로드 완료 후 초기화
window.addEventListener('load', () => { import('./sentry.js') })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
