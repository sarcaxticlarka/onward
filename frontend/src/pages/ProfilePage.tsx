import { useNavigate } from 'react-router-dom'
import { LogOut, User, Mail, Clock, Shield, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useLogout } from '../hooks/useAuth'

export function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const logoutMutation = useLogout()

  const displayName =
    (user?.preferences?.display_name as string) ||
    user?.email?.split('@')[0] ||
    'user'

  const avatar = user?.preferences?.avatar as string | undefined

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    })
  }

  return (
    <div>
      <div className="top-status">
        <span className="availability">profile</span>
        <span><span className="mini-tag">account</span> → <span className="mini-tag">settings</span></span>
      </div>

      <section className="section-band soft-panel" style={{ paddingTop: 48, paddingBottom: 48, marginBottom: 34 }}>
        <div className="other-projects" style={{ minHeight: 220, alignItems: 'center' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: avatar ? 'transparent' : 'var(--sidebar)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 900, color: '#fff',
              overflow: 'hidden', flexShrink: 0,
              border: '3px solid var(--sidebar)',
            }}>
              {avatar
                ? <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials}
            </div>
            <div>
              <h1 className="headline" style={{ fontSize: 'clamp(36px, 5vw, 72px)', marginBottom: 4 }}>
                {displayName}
              </h1>
              <p style={{ color: 'var(--gray)', fontSize: 16 }}>{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Info cards */}
      <div className="metric-grid" style={{ marginBottom: 32 }}>
        <article className="metric-card">
          <Mail size={20} color="var(--sidebar)" style={{ marginBottom: 8 }} />
          <strong style={{ fontSize: 14, wordBreak: 'break-all' }}>{user?.email}</strong>
          <span className="section-label">email</span>
        </article>
        <article className="metric-card">
          <Clock size={20} color="var(--sidebar)" style={{ marginBottom: 8 }} />
          <strong style={{ fontSize: 14 }}>{user?.timezone || 'UTC'}</strong>
          <span className="section-label">timezone</span>
        </article>
        <article className="metric-card">
          <Shield size={20} color="var(--sidebar)" style={{ marginBottom: 8 }} />
          <strong style={{ fontSize: 14 }}>
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString()
              : '—'}
          </strong>
          <span className="section-label">member since</span>
        </article>
        <article className="metric-card">
          <User size={20} color="var(--sidebar)" style={{ marginBottom: 8 }} />
          <strong style={{ fontSize: 14, wordBreak: 'break-all' }}>{user?.id?.slice(0, 8)}…</strong>
          <span className="section-label">user id</span>
        </article>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="black-button"
          style={{ minHeight: 52 }}
        >
          go to dashboard <ArrowRight size={16} />
        </button>
        <button
          onClick={() => navigate('/tasks')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 24px', minHeight: 52, borderRadius: 14,
            border: '2px solid var(--sidebar)', background: 'var(--cream-dark)',
            color: 'var(--sidebar)', fontWeight: 900, fontSize: 15, cursor: 'pointer',
          }}
        >
          view tasks <ArrowRight size={16} />
        </button>
        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 24px', minHeight: 52, borderRadius: 14,
            border: '2px solid #ef4444', background: 'transparent',
            color: '#ef4444', fontWeight: 900, fontSize: 15, cursor: 'pointer',
          }}
        >
          <LogOut size={16} />
          {logoutMutation.isPending ? 'signing out…' : 'sign out'}
        </button>
      </div>
    </div>
  )
}
