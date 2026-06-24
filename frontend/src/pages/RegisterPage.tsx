import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle, Eye, EyeOff, UserPlus } from 'lucide-react'
import { PortfolioSidebar } from '../components/brand/PortfolioSidebar'
import { IconStack } from '../components/brand/BrandMarks'
import { useRegister } from '../hooks/useAuth'

const STEPS = ['email', 'password'] as const
const PERKS = ['natural language task capture', 'ai subtask breakdowns', 'calendar conflict solving', 'crisis mode alerts']

const NAV = [
  { to: '/', label: 'home', num: '01' },
  { to: '/login', label: 'login', num: '02' },
  {
    to: '/register',
    label: 'register',
    num: '03',
    details: (
      <>
        <span>start your LMLS workspace</span>
        <span>free</span>
      </>
    ),
  },
  { to: '/#contact', label: 'contact', num: '04' },
]

export function RegisterPage() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()
  const registerMutation = useRegister()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (step === 0) {
      setStep(1)
      return
    }
    registerMutation.mutate(
      { email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      { onSuccess: () => navigate('/dashboard') },
    )
  }

  return (
    <div className="app-frame auth-frame">
      <PortfolioSidebar items={NAV} ctaLabel="sign in" ctaTo="/login" />
      <main className="page-canvas auth-canvas">
        <div className="top-status">
          <span className="availability">new LMLS workspace available</span>
          <span><span className="mini-tag">step {step + 1}</span> of 2</span>
        </div>

        <section className="auth-card auth-card-compact">
          <IconStack compact />
          <p className="section-label auth-kicker">create account</p>
          <h1 className="headline auth-title">start now.</h1>
          <p className="auth-copy">
            your LMLS agent decomposes work, schedules focus blocks, and warns you before the week breaks.
          </p>

          {/* Google Sign-Up */}
          <a
            href="http://localhost:8000/auth/google"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 24px', borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--white)', fontWeight: 700, fontSize: 16, cursor: 'pointer', textDecoration: 'none', color: 'var(--black)', marginBottom: 4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            sign up with google
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--gray-light)', fontSize: 13, fontWeight: 600 }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div className="chip-row auth-perks">
            {PERKS.map(perk => <span className="chip" key={perk}><CheckCircle size={14} /> {perk}</span>)}
          </div>

          <div className="auth-progress">
            {STEPS.map((item, index) => (
              <div key={item} style={{ height: 8, flex: 1, borderRadius: 8, background: index <= step ? 'var(--sidebar)' : 'var(--cream-dark)' }} />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div>
              {step === 0 ? (
                <label>
                  <span className="section-label">email address</span>
                  <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </label>
              ) : (
                <div style={{ display: 'grid', gap: 20 }}>
                  <div className="letter-note" style={{ margin: 0 }}>
                    <CheckCircle size={16} /> {email}
                    <button type="button" onClick={() => setStep(0)} style={{ marginLeft: 12, border: 0, background: 'transparent', color: 'var(--sidebar)', fontWeight: 900 }}>change</button>
                  </div>
                  <label style={{ position: 'relative' }}>
                    <span className="section-label">password (8+ chars)</span>
                    <input type={showPw ? 'text' : 'password'} placeholder="enter password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus style={{ paddingRight: 46 }} />
                    <button type="button" onClick={() => setShowPw(v => !v)} aria-label="Toggle password visibility" style={{ position: 'absolute', right: 4, bottom: 12, border: 0, background: 'transparent' }}>
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </label>
                </div>
              )}
            </div>

            {registerMutation.isError && (
              <div className="letter-note" style={{ margin: 0, color: 'var(--danger)' }}>
                Registration failed. That email may already be taken.
              </div>
            )}

            <button type="submit" disabled={registerMutation.isPending} className="black-button" style={{ width: '100%', opacity: registerMutation.isPending ? 0.65 : 1 }}>
              <UserPlus size={18} />
              {registerMutation.isPending ? 'creating...' : step === 0 ? 'continue' : 'create account'}
              {!registerMutation.isPending && <ArrowRight size={18} />}
            </button>
          </form>

          <p style={{ marginTop: 28, fontSize: 18, color: 'var(--gray)' }}>
            already have an account? <Link to="/login" className="accent-text" style={{ fontWeight: 900 }}>sign in</Link>
          </p>
        </section>
      </main>
    </div>
  )
}
