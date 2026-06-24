import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function GoogleCallbackPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore(s => s.setTokens)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const access = params.get('access')
    const refresh = params.get('refresh')
    if (access && refresh) {
      // Decode user from JWT payload
      try {
        const payload = JSON.parse(atob(access.split('.')[1]))
        useAuthStore.getState().setUser({ id: payload.sub, email: payload.email })
        setTokens(access, refresh)
        navigate('/dashboard', { replace: true })
      } catch {
        navigate('/login?error=google_failed', { replace: true })
      }
    } else {
      navigate('/login?error=google_failed', { replace: true })
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>signing you in...</div>
        <div style={{ color: 'var(--gray)' }}>completing Google authentication</div>
      </div>
    </div>
  )
}
