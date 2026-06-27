import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, CalendarCheck, CheckSquare, Flame, Mic, Plus, Sparkles, BarChart2, ChevronRight, CreditCard, Star, AlertTriangle } from 'lucide-react'
import { VoiceTaskInput } from '../components/tasks/VoiceTaskInput'
import { useTaskStore } from '../stores/taskStore'
import { useTasksQuery } from '../hooks/useTasks'
import { useAuthStore } from '../stores/authStore'
import { CrisisBanner } from '../components/agent/CrisisBanner'
import { XPBar } from '../components/gamification/XPBar'
import { TaskCard } from '../components/tasks/TaskCard'
import { AddTaskModal } from '../components/tasks/AddTaskModal'
import { CalendarPanel } from '../components/calendar/CalendarPanel'
import { PaymentModal } from '../components/payment/PaymentModal'
import { useBillingStatus } from '../hooks/useCalendar'
import { DeadlineRiskPanel } from '../components/analytics/DeadlineRiskPanel'

const STEPS = [
  {
    num: '01',
    icon: <Plus size={22} />,
    title: 'Add a task',
    desc: 'Type it in plain English — "Submit assignment by Friday 11pm". AI extracts the deadline, priority, and category automatically.',
    action: 'add task',
    to: null as string | null,
    key: 'add',
  },
  {
    num: '02',
    icon: <Sparkles size={22} />,
    title: 'Let AI break it down',
    desc: 'Click Decompose on any task. The agent splits it into ordered subtasks with time estimates so you always know the next step.',
    action: 'go to tasks',
    to: '/tasks',
    key: 'decompose',
  },
  {
    num: '03',
    icon: <Bot size={22} />,
    title: 'Ask the agent',
    desc: 'Tell the agent your situation — "I have 3 deadlines this week, what should I do first?" It reads your tasks and builds a plan.',
    action: 'open agent',
    to: '/agent',
    key: 'agent',
  },
  {
    num: '04',
    icon: <BarChart2 size={22} />,
    title: 'Track your progress',
    desc: 'Mark tasks as In Progress → Done using the action buttons. Earn XP, unlock badges, and see focus patterns in Analytics.',
    action: 'see analytics',
    to: '/analytics',
    key: 'track',
  },
]

function EmptyOnboarding({ onAddTask }: { onAddTask: () => void }) {
  return (
    <div>
      {/* Welcome */}
      <div style={{ textAlign: 'center', padding: '48px 24px 40px', borderRadius: 20, background: 'var(--cream-dark)', border: '1.5px solid var(--border)', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Bot size={28} color="var(--yellow)" />
        </div>
        <h2 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em', marginBottom: 10 }}>Welcome to Onward</h2>
        <p style={{ color: 'var(--gray)', fontSize: 16, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 28px' }}>
          Your AI productivity agent. Add a task and the agent takes care of the rest — breaking it down, scheduling it, and keeping you on track.
        </p>
        <button onClick={onAddTask} className="black-button" style={{ minHeight: 54, fontSize: 15 }}>
          <Plus size={18} /> add your first task
        </button>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: 12 }}>
        <p className="section-label" style={{ marginBottom: 4 }}>how it works</p>
        <h2 style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em', marginBottom: 24 }}>4 steps to get started</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {STEPS.map((step, i) => (
          <OnboardStep key={step.key} step={step} index={i} onAddTask={onAddTask} />
        ))}
      </div>
    </div>
  )
}

function OnboardStep({ step, index, onAddTask }: { step: typeof STEPS[0]; index: number; onAddTask: () => void }) {
  const navigate = useNavigate()
  const handleClick = () => {
    if (step.to) navigate(step.to)
    else onAddTask()
  }
  return (
    <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '24px 22px', background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: index === 0 ? 'var(--sidebar)' : 'var(--cream-dark)',
          color: index === 0 ? 'var(--yellow)' : 'var(--sidebar)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {step.icon}
        </div>
        <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em', color: 'var(--border)' }}>{step.num}</span>
      </div>
      <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>{step.title}</h3>
      <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, flex: 1 }}>{step.desc}</p>
      <button onClick={handleClick} style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
        color: 'var(--sidebar)', background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, marginTop: 4,
      }}>
        {step.action} <ChevronRight size={14} />
      </button>
    </div>
  )
}

function HowItWorksBar() {
  return (
    <div style={{ display: 'flex', gap: 0, borderRadius: 14, overflow: 'hidden', border: '1.5px solid var(--border)', marginBottom: 28 }}>
      {[
        { icon: <Plus size={14} />, label: 'Add task', sub: 'plain English' },
        { icon: <Sparkles size={14} />, label: 'AI parses', sub: 'deadline + priority' },
        { icon: <Bot size={14} />, label: 'Decompose', sub: 'into subtasks' },
        { icon: <CalendarCheck size={14} />, label: 'Schedule', sub: 'no conflicts' },
        { icon: <CheckSquare size={14} />, label: 'Mark done', sub: 'earn XP' },
        { icon: <Flame size={14} />, label: 'Track streak', sub: 'stay consistent' },
      ].map((item, i, arr) => (
        <div key={i} style={{
          flex: 1, padding: '10px 8px', textAlign: 'center', fontSize: 11,
          background: i % 2 === 0 ? 'var(--cream)' : 'var(--cream-dark)',
          borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--sidebar)', marginBottom: 3 }}>
            {item.icon}
            <span style={{ fontWeight: 800 }}>{item.label}</span>
          </div>
          <div style={{ color: 'var(--gray)', fontSize: 10 }}>{item.sub}</div>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const [modalOpen, setModalOpen]   = useState(false)
  const [voiceOpen, setVoiceOpen]   = useState(false)
  const [payModal, setPayModal]     = useState<{ plan: string; price: string } | null>(null)
  const { isLoading } = useTasksQuery()
  const { data: billing } = useBillingStatus()
  const tasks = useTaskStore(s => s.tasks ?? [])
  const user = useAuthStore(s => s.user)

  const pending    = tasks.filter(t => t.status === 'pending').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const completed  = tasks.filter(t => t.status === 'completed').length
  const overdue    = tasks.filter(t => t.status === 'overdue').length
  const upcoming   = tasks.filter(t => t.status !== 'completed').sort((a, b) => {
    // sort by score desc
    return (Number(b.ai_score) || 0) - (Number(a.ai_score) || 0)
  }).slice(0, 5)

  const isNewUser = !isLoading && tasks.length === 0
  const name = user?.email?.split('@')[0] ?? 'there'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 60px' }}>
      <div className="top-status">
        <span className="availability">Onward is live</span>
        <span><span className="mini-tag">dashboard</span></span>
      </div>

      {/* Header greeting */}
      <div style={{ padding: '32px 0 24px', borderBottom: '1.5px solid var(--border)', marginBottom: 28 }}>
        <p className="section-label" style={{ marginBottom: 6 }}>welcome back</p>
        <h1 style={{ fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-0.03em', marginBottom: 8 }}>
          hey, {name}.
        </h1>
        <p style={{ color: 'var(--gray)', fontSize: 15 }}>
          {isNewUser
            ? "You're all set up. Start by adding your first task below."
            : `You have ${pending + inProgress} active task${pending + inProgress !== 1 ? 's' : ''} — ${overdue > 0 ? `⚠️ ${overdue} overdue.` : 'all on track.'}`}
        </p>
      </div>

      <CrisisBanner />
      {/* Auto-detect crisis and show banner */}
      {overdue >= 3 && (
        <Link to="/crisis" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: 14, background: '#dc2626', padding: '14px 20px',
          textDecoration: 'none', marginBottom: 20,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="#fff" />
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>Crisis Mode — {overdue} overdue tasks!</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Click to open your AI survival plan</div>
            </div>
          </div>
          <ArrowRight size={18} color="#fff" />
        </Link>
      )}

      {/* New user: full onboarding */}
      {isNewUser && <EmptyOnboarding onAddTask={() => setModalOpen(true)} />}

      {/* Returning user */}
      {!isNewUser && (
        <>
          {/* Google Calendar — top of dashboard */}
          <div style={{ marginBottom: 28 }}>
            <CalendarPanel />
          </div>

          {/* How it works strip */}
          <HowItWorksBar />

          {/* Stats */}
          <div className="metric-grid" style={{ marginBottom: 28 }}>
            {[
              { label: 'pending',     value: pending,    color: 'var(--black)' },
              { label: 'in progress', value: inProgress, color: '#2563eb' },
              { label: 'completed',   value: completed,  color: '#16a34a' },
              { label: 'overdue',     value: overdue,    color: '#dc2626' },
            ].map(s => (
              <article className="metric-card" key={s.label}>
                <strong style={{ color: s.color }}>{String(s.value).padStart(2, '0')}</strong>
                <span className="section-label">{s.label}</span>
              </article>
            ))}
          </div>

          {/* Main layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
            {/* Tasks column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p className="section-label" style={{ marginBottom: 2 }}>priority queue</p>
                  <h2 style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>Your top tasks</h2>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setVoiceOpen(true)} title="Add task by voice" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: 'var(--sidebar)', color: 'var(--yellow)', border: '1.5px solid var(--sidebar)', cursor: 'pointer' }}>
                    <Mic size={13} /> voice
                  </button>
                  <button onClick={() => setModalOpen(true)} className="pill pill-black" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={13} /> add task
                  </button>
                  <Link to="/tasks" className="pill" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    view all <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {isLoading && [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 86, marginBottom: 10, borderRadius: 12 }} />)}

              {!isLoading && upcoming.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, borderRadius: 16, background: 'var(--cream)', border: '1.5px dashed var(--border)' }}>
                  <CheckSquare size={36} color="var(--gray-light)" />
                  <p style={{ color: 'var(--gray)', marginTop: 12, fontSize: 15 }}>All tasks completed. Add new ones to keep going.</p>
                  <button onClick={() => setModalOpen(true)} className="black-button" style={{ marginTop: 16, minHeight: 48 }}>
                    <Plus size={16} /> add task
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(task => <TaskCard key={task.id} task={task} />)}
              </div>

              {upcoming.length > 0 && (
                <Link to="/tasks" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13, fontWeight: 700, color: 'var(--gray)', textDecoration: 'none' }}>
                  view all {tasks.filter(t => t.status !== 'completed').length} active tasks <ArrowRight size={13} />
                </Link>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Deadline Risk */}
              <DeadlineRiskPanel />

              {/* XP */}
              <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '18px 20px', background: 'var(--white)' }}>
                <p className="section-label" style={{ marginBottom: 12 }}>your progress</p>
                <XPBar />
              </div>

              {/* Agent CTA */}
              <div style={{ borderRadius: 16, background: 'var(--sidebar)', padding: '22px 20px', color: '#fff' }}>
                <Bot size={28} color="var(--yellow)" style={{ marginBottom: 12 }} />
                <h3 style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 8 }}>Talk to your agent</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 18 }}>
                  "Plan my week", "Which task should I do first?", "Activate crisis mode"
                </p>
                <Link to="/agent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, background: 'var(--yellow)', color: 'var(--black)', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
                  <Bot size={16} /> open agent
                </Link>
              </div>

              {/* Quick help */}
              <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', padding: '18px 20px', background: 'var(--white)' }}>
                <p className="section-label" style={{ marginBottom: 12 }}>quick tips</p>
                {[
                  { tip: 'Click the checkbox to mark a task done', icon: '✓' },
                  { tip: 'Use Decompose to split any task into steps', icon: '✦' },
                  { tip: 'Filters on Tasks page to sort by priority/deadline', icon: '⊞' },
                  { tip: 'Agent earns you XP when it helps you plan', icon: '⚡' },
                ].map(({ tip, icon }) => (
                  <div key={tip} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 12, color: 'var(--gray)', lineHeight: 1.4 }}>
                    <span style={{ color: 'var(--sidebar)', fontWeight: 900, flexShrink: 0, fontSize: 14 }}>{icon}</span>
                    {tip}
                  </div>
                ))}
              </div>

              {/* Analytics link */}
              <Link to="/analytics" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, border: '1.5px solid var(--border)', padding: '16px 20px', background: 'var(--cream)', textDecoration: 'none', color: 'var(--black)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BarChart2 size={20} color="var(--sidebar)" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Analytics</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)' }}>focus patterns & leaderboard</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--gray)" />
              </Link>

              {/* Billing status / upgrade */}
              {billing && billing.plan === 'free' ? (
                <div style={{ borderRadius: 16, border: '1.5px solid #fde68a', background: '#fffbeb', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Star size={16} color="#d97706" fill="#d97706" />
                    <span style={{ fontWeight: 800, fontSize: 14, color: '#92400e' }}>Free plan</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5, marginBottom: 12 }}>
                    Upgrade to unlock unlimited tasks, calendar sync & crisis mode.
                  </p>
                  <button onClick={() => setPayModal({ plan: 'focus', price: '₹299' })} className="yellow-button" style={{ width: '100%', justifyContent: 'center', minHeight: 40, fontSize: 13 }}>
                    <CreditCard size={13} /> upgrade — ₹299/mo
                  </button>
                </div>
              ) : billing && billing.plan !== 'free' ? (
                <div style={{ borderRadius: 16, border: '1.5px solid #86efac', background: '#f0fdf4', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Star size={16} color="#16a34a" fill="#16a34a" />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#166534' }}>{billing.plan} plan active</div>
                    <div style={{ fontSize: 11, color: '#16a34a' }}>all features unlocked</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

        </>
      )}

      <AddTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
      {voiceOpen && <VoiceTaskInput onClose={() => setVoiceOpen(false)} />}
      {payModal && (
        <PaymentModal
          plan={payModal.plan}
          price={payModal.price}
          onClose={() => setPayModal(null)}
          onSuccess={() => setPayModal(null)}
        />
      )}
    </div>
  )
}
