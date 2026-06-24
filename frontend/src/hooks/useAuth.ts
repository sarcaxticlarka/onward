import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import type { AuthTokens, User } from '../types'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload extends LoginPayload {
  timezone?: string
}

interface AuthResponse extends AuthTokens {
  user: User
}

export function useLogin() {
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<AuthResponse>('/auth/login', payload)
      return data
    },
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
      setUser(data.user)
    },
  })
}

export function useRegister() {
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post<AuthResponse>('/auth/register', payload)
      return data
    },
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token)
      setUser(data.user)
    },
  })
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout)

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout')
    },
    onSettled: () => {
      logout()
    },
  })
}
