import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function GoogleCallbackPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore(s => s.setTokens)

  useEffect(() => {
    // Tokens can come as hash fragment: #access=...&refresh=...
    // OR as query params: ?access=...&refresh=... (some browsers strip hashes on redirect)
    const hash = window.location.hash.slice(1)
    const search = window.location.search.slice(1)

    const hashParams = new URLSearchParams(hash)
    const queryParams = new URLSearchParams(search)

    const access = hashParams.get('access') || queryParams.get('access')
    const refresh = hashParams.get('refresh') || queryParams.get('refresh')

    if (access && refresh) {
      try {
        // Decode JWT payload (base64url → base64 → JSON)
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
        navigate('/profile', { replace: true })
      } catch (err) {
        console.error('Google callback parse error:', err)
        navigate('/login?error=google_failed', { replace: true })
      }
    } else {
      console.error('Google callback: no tokens found in hash or query', { hash, search })
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
