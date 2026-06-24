import { useState } from 'react'
import { X, CreditCard, Lock, CheckCircle, Loader2 } from 'lucide-react'
import api from '../../lib/api'

interface Props {
  plan: string
  price: string
  onClose: () => void
  onSuccess: () => void
}

type Step = 'form' | 'processing' | 'success'

const PLAN_FEATURES: Record<string, string[]> = {
  free:   ['5 tasks', 'basic agent', 'task decomposition'],
  focus:  ['unlimited tasks', 'AI agent + decomposition', 'Google Calendar sync', 'conflict detection', 'XP + streak tracking'],
  crisis: ['everything in focus', 'crisis mode activation', 'hour-by-hour recovery plans', 'advanced analytics', 'priority support'],
}

export function PaymentModal({ plan, price, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [card, setCard]         = useState('')
  const [expiry, setExpiry]     = useState('')
  const [cvv, setCvv]           = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')

  const formatCard = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const formatExpiry = (v: string) =>
    v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')

  const fillTest = () => {
    setCard('4111 1111 1111 1111')
    setExpiry('12/28')
    setCvv('123')
    setName('Test User')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const rawCard = card.replace(/\s/g, '')
    if (rawCard.length < 16) { setError('Enter a valid 16-digit card number.'); return }
    if (expiry.length < 5)   { setError('Enter a valid expiry (MM/YY).'); return }
    if (cvv.length < 3)      { setError('Enter a valid CVV.'); return }
    if (!name.trim())         { setError('Enter the cardholder name.'); return }

    setStep('processing')
    try {
      await api.post('/billing/subscribe', { plan })
      await new Promise(r => setTimeout(r, 1800)) // simulate processing
      setStep('success')
    } catch {
      setStep('form')
      setError('Payment failed. Please try again or use the test card.')
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
    >
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--white)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ background: 'var(--sidebar)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              LMLS / Onward
            </div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', marginTop: 2 }}>
              {plan} plan — {price}/mo
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={15} />
          </button>
        </div>

        {/* Features strip */}
        <div style={{ background: 'var(--cream-dark)', padding: '10px 24px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(PLAN_FEATURES[plan] ?? []).map(f => (
            <span key={f} style={{ fontSize: 11, fontWeight: 700, color: 'var(--sidebar)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={11} color="#16a34a" /> {f}
            </span>
          ))}
        </div>

        <div style={{ padding: '24px 24px 28px' }}>
          {step === 'success' ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={52} color="#16a34a" style={{ marginBottom: 16 }} />
              <h3 style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 8 }}>Payment successful!</h3>
              <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 24 }}>
                Your <strong>{plan}</strong> plan is now active. Redirecting to dashboard…
              </p>
              <button onClick={onSuccess} className="black-button" style={{ width: '100%', justifyContent: 'center', minHeight: 48 }}>
                go to dashboard
              </button>
            </div>
          ) : step === 'processing' ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Loader2 size={36} color="var(--sidebar)" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
              <p style={{ fontWeight: 700, fontSize: 16 }}>Processing payment…</p>
              <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>Please do not close this window.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Test card hint */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>🔒 Test mode — no real charges</span>
                <button type="button" onClick={fillTest} style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  use test card
                </button>
              </div>

              {/* Card number */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Card Number</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--cream)' }}>
                  <CreditCard size={16} color="var(--gray)" />
                  <input
                    value={card}
                    onChange={e => setCard(formatCard(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  />
                </div>
              </div>

              {/* Expiry + CVV */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expiry</label>
                  <input
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    maxLength={5}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--cream)', fontSize: 15, fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>CVV</label>
                  <input
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    type="password"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--cream)', fontSize: 15, fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Cardholder Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name on card"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--cream)', fontSize: 15 }}
                />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fee2e2', border: '1.5px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <button type="submit" className="black-button" style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: 15, marginTop: 4 }}>
                <Lock size={15} /> Pay {price}
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray-light)' }}>
                Secured by 256-bit SSL encryption. Cancel anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
