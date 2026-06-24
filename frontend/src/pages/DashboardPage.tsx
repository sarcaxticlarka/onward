import { Link } from 'react-router-dom'
import { ArrowRight, Bot, CalendarCheck, CheckSquare, Flame } from 'lucide-react'
import { useTaskStore } from '../stores/taskStore'
import { useTasksQuery } from '../hooks/useTasks'
import { useAuthStore } from '../stores/authStore'
import { CrisisBanner } from '../components/agent/CrisisBanner'
import { XPBar } from '../components/gamification/XPBar'
import { BadgeList } from '../components/gamification/BadgeList'
import { TaskCard } from '../components/tasks/TaskCard'
import { IconStack } from '../components/brand/BrandMarks'

export function DashboardPage() {
  const { isLoading } = useTasksQuery()
  const tasks = useTaskStore(s => s.tasks)
  const user = useAuthStore(s => s.user)

  const pending = tasks.filter(t => t.status === 'pending').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const completed = tasks.filter(t => t.status === 'completed').length
  const urgent = tasks.filter(t => t.status !== 'completed' && (['high', 'critical'] as string[]).includes(t.priority)).length
  const upcoming = tasks.filter(t => t.status !== 'completed').slice(0, 5)

  return (
    <div>
      <div className="top-status" data-a>
        <span className="availability">Onward is watching today's deadlines</span>
        <span><span className="mini-tag">dashboard</span> → <span className="mini-tag">live</span></span>
      </div>

      <section className="hero-lockup" style={{ minHeight: 'auto', padding: '12px 0 56px' }} data-a>
        <div>
          <h1 className="hero-title" style={{ fontSize: 'clamp(72px, 10vw, 170px)' }}>
            deadlines<br />move when<br />plans are clear
          </h1>
          <p className="hero-copy" style={{ marginTop: 18 }}>
            {user?.email?.split('@')[0] || 'there'}, your agent view turns tasks, risk, focus, and rewards into one readable command center.
          </p>
        </div>
      </section>

      <div data-a style={{ marginBottom: 28 }}>
        <CrisisBanner />
      </div>

      <section className="metric-grid" data-a>
        {[
          ['pending', pending, 'var(--sidebar)'],
          ['in progress', inProgress, 'var(--blue)'],
          ['completed', completed, 'var(--success)'],
          ['urgent', urgent, 'var(--danger)'],
        ].map(([label, value, color]) => (
          <article className="metric-card" key={label}>
            <strong style={{ color: String(color) }}>{String(value).padStart(2, '0')}</strong>
            <span className="section-label">{label}</span>
          </article>
        ))}
      </section>

      <section className="section-band dashboard-grid">
        <div data-a>
          <article className="featured-card" style={{ minHeight: 520 }}>
            <img style={{ minHeight: 520 }} src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1400&auto=format&fit=crop&q=80" alt="Task dashboard on a desk" />
            <span className="feature-label">featured action</span>
            <div className="featured-meta">
              <h2>ask Onward to rebuild today</h2>
              <p>decompose, schedule, resolve conflicts</p>
              <Link to="/agent" className="black-button" style={{ minHeight: 54, marginTop: 18 }}>open agent <ArrowRight size={16} /></Link>
            </div>
          </article>
        </div>

        <aside data-a style={{ display: 'grid', gap: 18 }}>
          <article className="service-card" style={{ minHeight: 260 }}>
            <IconStack compact />
            <h3>path to done</h3>
            <div className="chip-row">
              <span className="chip"><Flame size={14} /> discover</span>
              <span className="chip"><Bot size={14} /> plan</span>
              <span className="chip"><CalendarCheck size={14} /> schedule</span>
            </div>
          </article>
          <article className="service-card" style={{ minHeight: 260, background: 'var(--black)', color: 'var(--cream)' }}>
            <h3>ready to plan another task</h3>
            <Link to="/tasks" className="yellow-button" style={{ marginTop: 'auto', minHeight: 54 }}>add task</Link>
          </article>
        </aside>
      </section>

      <section className="section-band dashboard-grid" style={{ paddingTop: 0 }}>
        <div data-a>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 18 }}>
            <h2 className="headline" style={{ fontSize: 'clamp(38px, 4vw, 62px)' }}>upcoming tasks</h2>
            <Link to="/tasks">view all <ArrowRight size={14} /></Link>
          </div>

          {isLoading && [1, 2, 3].map(item => <div key={item} className="skeleton" style={{ height: 86, marginBottom: 10 }} />)}
          {!isLoading && upcoming.length === 0 && (
            <div className="letter-panel" style={{ textAlign: 'center' }}>
              <CheckSquare size={42} color="var(--gray-light)" />
              <h2 style={{ marginTop: 16 }}>all clear.</h2>
              <p>no pending tasks. add one and let the agent create the plan.</p>
              <Link to="/tasks" className="black-button" style={{ minHeight: 54, marginTop: 24 }}>add task</Link>
            </div>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            {upcoming.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>

        <aside data-a style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div>
            <p className="section-label">progress</p>
            <XPBar />
          </div>
          <div>
            <p className="section-label">badges</p>
            <div className="card" style={{ padding: 18 }}>
              <BadgeList />
            </div>
          </div>
          <article className="service-card" style={{ minHeight: 220 }}>
            <Bot size={34} color="var(--sidebar)" />
            <h3>talk to your agent</h3>
            <p style={{ color: 'var(--gray)', fontSize: 18 }}>plan your day, decompose a task, or activate crisis mode.</p>
            <Link to="/agent" className="black-button" style={{ minHeight: 54, marginTop: 'auto' }}>open agent</Link>
          </article>
        </aside>
      </section>
    </div>
  )
}
