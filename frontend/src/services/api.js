import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://api.dumpit.kr/api' : '/api')

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export function getApiErrorMessage(error, fallback = '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.') {
  const data = error?.response?.data
  if (typeof data?.error === 'string' && data.error.trim()) return data.error
  if (typeof data?.message === 'string' && data.message.trim()) return data.message

  if (error?.response?.status === 401) return '로그인이 필요합니다.'
  if (error?.response?.status === 403) return '접근 권한이 없습니다.'
  if (error?.response?.status === 404) return '요청한 대상을 찾을 수 없습니다.'
  if (error?.response?.status === 429) return '사용 가능 횟수를 모두 사용했어요.'
  if (error?.response?.status >= 500) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  return fallback
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = getApiErrorMessage(error)
    const status = error.response?.status
    const url = error.config?.url || ''
    const isCalendarActionRequired = url.includes('/calendar/events')
      && ['CALENDAR_PERMISSION_REQUIRED', 'GOOGLE_CALENDAR_RECONNECT_REQUIRED']
        .includes(error.response?.data?.code)
    if (
      typeof window !== 'undefined' &&
      !url.includes('/auth/me') &&
      !isCalendarActionRequired &&
      (status === 403 || status >= 500)
    ) {
      window.dispatchEvent(new CustomEvent('dumpit:toast', {
        detail: { message: error.userMessage, type: 'error' },
      }))
    }
    if (status === 401) {
      if (!url.includes('/auth/me')) {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api
