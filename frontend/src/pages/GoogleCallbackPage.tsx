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
        // JWT uses base64url (no padding, - and _); atob needs standard base64 (+ and / with = padding)
        const raw = access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const b64 = raw + '='.repeat((4 - raw.length % 4) % 4)
        const payload = JSON.parse(atob(b64))
        useAuthStore.getState().setUser({
          id: payload.sub,
          email: payload.email,
          preferences: {},
          timezone: 'UTC',
          created_at: '',
        })
        setTokens(access, refresh)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Google callback parse error:', err)
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
