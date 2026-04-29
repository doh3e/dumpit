import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://api.dumpit.kr' : '/api')

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!error.config.url.includes('/auth/me')) {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api
