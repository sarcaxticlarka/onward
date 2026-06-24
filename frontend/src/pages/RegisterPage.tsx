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
        <span>start the Onward workspace</span>
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
          <span className="availability">new Onward board available</span>
          <span><span className="mini-tag">step {step + 1}</span> of 2</span>
        </div>

        <section className="auth-card auth-card-compact">
          <IconStack compact />
          <p className="section-label auth-kicker">create account</p>
          <h1 className="headline auth-title">start now.</h1>
          <p className="auth-copy">
            build an Onward workspace where the agent decomposes work, schedules focus blocks, and warns you before the week breaks.
          </p>

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
