import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { PortfolioSidebar } from '../components/brand/PortfolioSidebar'
import { IconStack } from '../components/brand/BrandMarks'
import { useLogin } from '../hooks/useAuth'
import { useAuthStore } from '../stores/authStore'

const NAV = [
  { to: '/', label: 'home', num: '01' },
  {
    to: '/login',
    label: 'login',
    num: '02',
    details: (
      <>
        <span>return to your LMLS board</span>
        <span>secure</span>
      </>
    ),
  },
  { to: '/register', label: 'register', num: '03' },
  { to: '/#contact', label: 'contact', num: '04' },
]

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const googleError = searchParams.get('error')
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const loginMutation = useLogin()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
    // If already authenticated, go to dashboard (stale ?error in URL after re-login)
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
      return
    }
    // Clear the error param from URL after 5 seconds so it doesn't linger
    if (googleError) {
      const t = setTimeout(() => {
        setSearchParams({}, { replace: true })
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [isAuthenticated])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ email, password }, { onSuccess: () => navigate('/dashboard') })
  }

  return (
    <div className="app-frame auth-frame">
      <PortfolioSidebar items={NAV} ctaLabel="create account" ctaTo="/register" />
      <main className="page-canvas auth-canvas">
        <div className="top-status">
          <span className="availability">agent workspace waiting</span>
          <span><span className="mini-tag">secure</span> login</span>
        </div>

        <section className="auth-card auth-card-compact">
          <IconStack compact />
          <p className="section-label auth-kicker">welcome back</p>
          <h1 className="headline auth-title">sign in.</h1>
          <p className="auth-copy">
            open your LMLS dashboard, review the current risk, and ask the agent what to do next.
          </p>

          {/* Google Sign-In */}
          {googleError && (
            <div className="letter-note" style={{ margin: '0 0 12px', color: 'var(--danger)', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
              Google sign-in failed: {googleError.replace(/_/g, ' ')}. Please try again or use email/password.
            </div>
          )}
          <a
            href={`${import.meta.env.VITE_API_BASE_URL ?? 'https://onward-80yh.onrender.com'}/auth/google`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 24px', borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--white)', fontWeight: 700, fontSize: 16, cursor: 'pointer', textDecoration: 'none', color: 'var(--black)', marginBottom: 4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            continue with google
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--gray-light)', fontSize: 13, fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span className="section-label">email address</span>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </label>

            <label style={{ position: 'relative' }}>
              <span className="section-label">password</span>
              <input type={showPw ? 'text' : 'password'} placeholder="enter password" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 46 }} />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label="Toggle password visibility" style={{ position: 'absolute', right: 4, bottom: 12, border: 0, background: 'transparent' }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>

            {loginMutation.isError && (
              <div className="letter-note" style={{ margin: 0, color: 'var(--danger)' }}>
                Invalid email or password.
              </div>
            )}

            <button type="submit" disabled={loginMutation.isPending} className="black-button" style={{ width: '100%', opacity: loginMutation.isPending ? 0.65 : 1 }}>
              <LogIn size={18} />
              {loginMutation.isPending ? 'signing in...' : 'sign in'}
            </button>
          </form>

          <p style={{ marginTop: 28, fontSize: 18, color: 'var(--gray)' }}>
            no account? <Link to="/register" className="accent-text" style={{ fontWeight: 900 }}>create one free</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
