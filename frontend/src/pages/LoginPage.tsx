import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { PortfolioSidebar } from '../components/brand/PortfolioSidebar'
import { IconStack } from '../components/brand/BrandMarks'
import { useLogin } from '../hooks/useAuth'

const NAV = [
  { to: '/', label: 'home', num: '01' },
  {
    to: '/login',
    label: 'login',
    num: '02',
    details: (
      <>
        <span>return to your Onward board</span>
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
  const loginMutation = useLogin()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [])

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
            open your Onward board, review the current risk, and ask the agent what to do next.
          </p>

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
