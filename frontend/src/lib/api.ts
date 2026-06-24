import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let pendingQueue: Array<() => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push(() => resolve(api(originalRequest)))
        })
      }

      isRefreshing = true
      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
        pendingQueue.forEach((cb) => cb())
        pendingQueue = []
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

export default api
