import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, CalendarCheck, CheckCircle, CheckCircle2, Flame, Mail, Mic, Sparkles, Star, X, Zap } from 'lucide-react'
import { BrandDots, IconStack } from '../components/brand/BrandMarks'
import { PortfolioSidebar } from '../components/brand/PortfolioSidebar'
import { useAuthStore } from '../stores/authStore'
import { PaymentModal } from '../components/payment/PaymentModal'
import builderPhoto from '../assets/lp.jpeg'

const NAV = [
  {
    to: '/',
    label: 'features',
    num: '01',
    details: (
      <>
        <span>AI agent + calendar sync</span>
        <span>5 core flows</span>
      </>
    ),
  },
  {
    to: '/#about',
    label: 'about',
    num: '02',
    details: (
      <>
        <span>our story & vision</span>
        <span>builder notes</span>
      </>
    ),
  },
  {
    to: '/#services',
    label: 'services',
    num: '03',
    details: (
      <>
        <span>5 core capabilities</span>
        <span>AI + calendar</span>
      </>
    ),
  },
  {
    to: '/#plans',
    label: 'plans',
    num: '04',
    details: (
      <>
        <span>starter / focus / crisis</span>
        <span>from free</span>
      </>
    ),
  },
  {
    to: '/#contact',
    label: 'contact',
    num: '05',
    details: (
      <>
        <span>drop a note</span>
        <span>builders welcome</span>
      </>
    ),
  },
]

const FLOWS = [
  ['finals week autopilot', 'study breakdown, calendar blocks', '2026'],
  ['hackathon sprint plan', '24-hour agent sprint, conflict map', '2026'],
  ['thesis finish runway', 'subtask tree, daily focus blocks', '2026'],
  ['job offer decision plan', 'deadline parsing, nudge schedule', '2025'],
  ['startup launch week', 'crisis mode, hour-by-hour plan', '2025'],
]

const SERVICES = [
  { title: 'task capture', tags: ['natural language', 'deadline parsing'], Icon: Zap },
  { title: 'agent planning', tags: ['subtask decomposition', 'priority scoring'], Icon: Bot },
  { title: 'calendar command', tags: ['conflict detection', 'auto scheduling'], Icon: CalendarCheck },
  { title: 'crisis mode', tags: ['24h backlog reset', 'hour-by-hour plan'], Icon: Flame },
  { title: 'voice capture', tags: ['speak tasks', 'hands-free input'], Icon: Mic },
]

const PROOF_POINTS = [
  ['tasks broken down instantly', 'one sentence. full subtask plan.', '01'],
  ['deadlines you actually hit', 'highest-risk task always surfaces first.', '02'],
  ['calendar conflicts gone', 'Google Calendar sync flags clashes before they hit.', '03'],
  ['crisis mode', 'hour-by-hour recovery when it all piles up.', '04'],
  ['see your progress', 'heatmap, streak, weekly AI report card.', '05'],
]

const OUTCOMES = [
  ['riya sharma', 'final year student', 'it broke my thesis into actual daily blocks. first time in weeks i knew what to do when i opened my laptop.', 'https://images.unsplash.com/photo-1762341104634-998bbee0ccba?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
  ['arjun mehta', 'hackathon lead', 'crisis mode hit when we had 6 tasks and 4 hours. the agent ordered them, flagged the blocker, and we shipped.', 'https://images.unsplash.com/photo-1619457164717-b11dd65f7ef2?q=80&w=974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
  ['priya iyer', 'product manager', 'calendar sync finally showed me why i kept missing prep time. conflict detection changed how i plan sprints.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80'],
  ['karan thakur', 'freelance developer', 'one place for tasks, calendar pressure, agent chat, and progress charts. everything else felt like a to-do list.', 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=989&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
]

const HOW_STEPS = [
  { num: '01', title: 'capture the chaos', desc: 'dump your tasks in plain language — deadlines, blockers, everything. the agent parses it instantly.' },
  { num: '02', title: 'agent breaks it down', desc: 'each task is decomposed into subtasks, scored by priority, and checked against your calendar.' },
  { num: '03', title: 'conflicts resolved', desc: 'calendar clashes are flagged and rescheduled. focus blocks land where they fit.' },
  { num: '04', title: 'crisis mode if needed', desc: 'when 3+ high-priority tasks hit 24h, crisis mode activates with an hour-by-hour recovery plan.' },
]

const PLANS = [
  {
    name: 'starter',
    price: 'free',
    sub: 'forever',
    badge: null,
    featured: false,
    features: [
      { ok: true, text: 'up to 20 tasks/month' },
      { ok: true, text: 'natural language task input' },
      { ok: true, text: 'basic priority scoring' },
      { ok: false, text: 'AI agent chat' },
      { ok: false, text: 'calendar sync' },
      { ok: false, text: 'crisis mode' },
    ],
    cta: 'get started',
    ctaTo: '/register',
  },
  {
    name: 'focus',
    price: '₹299',
    sub: '/month',
    badge: 'most popular',
    featured: true,
    features: [
      { ok: true, text: 'unlimited tasks' },
      { ok: true, text: 'AI agent + subtask decomposition' },
      { ok: true, text: 'Google Calendar sync' },
      { ok: true, text: 'conflict detection' },
      { ok: true, text: 'XP + streak tracking' },
      { ok: false, text: 'crisis mode' },
    ],
    cta: 'start focus plan',
    ctaTo: '/register',
  },
  {
    name: 'crisis',
    price: '₹699',
    sub: '/month',
    badge: null,
    featured: false,
    features: [
      { ok: true, text: 'everything in focus' },
      { ok: true, text: 'crisis mode — full activation' },
      { ok: true, text: 'hour-by-hour recovery plans' },
      { ok: true, text: 'advanced analytics dashboard' },
      { ok: true, text: 'priority support' },
      { ok: true, text: 'early access to new flows' },
    ],
    cta: 'go crisis-ready',
    ctaTo: '/register',
  },
]

export default function LandingPage() {
  const [payModal, setPayModal] = useState<{ plan: string; price: string } | null>(null)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const navigate = useNavigate()

  const handlePlanClick = (plan: { name: string; price: string; ctaTo: string }) => {
    if (isAuthenticated) {
      setPayModal({ plan: plan.name, price: plan.price })
    } else {
      navigate('/register')
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
    // handle direct hash navigation on load
    if (window.location.hash) {
      const hash = window.location.hash.slice(1)
      setTimeout(() => {
        const target = document.getElementById(hash)
        const canvas = document.querySelector('.page-canvas')
        if (target && canvas) {
          canvas.scrollTo({ top: (target as HTMLElement).offsetTop - 40, behavior: 'smooth' })
        }
      }, 200)
    }
  }, [])

  return (
    <div className="app-frame">
      <PortfolioSidebar items={NAV} ctaLabel="login" ctaTo="/login" footerLabel="©2026 Onward." />

      <main className="page-canvas">
        <div className="top-status">
          <span className="availability">AI agent ready for deadline pressure</span>
          <span><span className="mini-tag">est.2026</span> <ArrowRight size={18} /> <span className="mini-tag">∞</span></span>
        </div>

        <section className="hero-lockup">
          <div>
            <h1 className="hero-title">
              <span className="hero-line"><span className="hero-word">last-m<span className="photo-dot" />nute</span></span>
              <span className="hero-line"><span className="hero-word">tasks become</span></span>
              <span className="hero-line"><span className="hero-word"><span className="moon-o" />clear plans</span></span>
            </h1>
            <p className="hero-copy">
              LMLS is an agentic AI productivity companion that captures messy tasks, decomposes them into subtasks, schedules focus blocks, resolves calendar conflicts, and escalates before deadlines are missed.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="yellow-button">get started free</Link>
              <Link to="/login" className="black-button">open dashboard</Link>
            </div>
          </div>
        </section>

        <section className="section-band">
          <article className="featured-card">
            <img src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1600&auto=format&fit=crop&q=80" alt="Planner desk with task notes" />
            <span className="feature-label">featured flow</span>
            <div className="featured-meta">
              <h2>the 24-hour LMLS crisis plan</h2>
              <p>deadline pressure, calendar conflicts, agent-driven recovery</p>
              <span>2026</span>
            </div>
          </article>

          <div className="project-list">
            {FLOWS.map(([name, tags, year]) => (
              <div className="project-row" key={name}>
                <strong>{name}</strong>
                <span>{tags}</span>
                <span>{year}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section-band how-section">
          <div className="how-orb how-orb-1" /><div className="how-orb how-orb-2" /><div className="how-orb how-orb-3" />
          <div className="other-projects">
            <h2 className='text-white font-bold'>other</h2>
            <div>
              <IconStack />
              <Link to="/tasks" className="black-button">view all flows</Link>
            </div>
            <h2 className='text-white'>plans</h2>
          </div>
        </section>

        <section id="about" className="section-band">
          <h2 className="bold-statement">
            we do not do vague reminders. just focused, <span className="accent-text">deadline-saving</span> plans that turn pressure into next actions.
          </h2>

          <article className="letter-panel">
            <img className="avatar-pin" src={builderPhoto} alt="Builder portrait" />
            <h2>our journey &amp; vision</h2>
            <p className="accent-text" style={{ fontSize: 28, marginBottom: 70 }}>a note from the builder</p>
            <p>dear friends,</p>
            <p style={{ marginTop: 28 }}>
              LMLS exists for the moment when your task list is too loud to organize. it reads the work, splits it into subtasks, finds the calendar space, and shows what deserves attention right now.
            </p>
            <p style={{ marginTop: 28 }}>
              the plan for 2026 is direct: make the AI agent trustworthy, make crisis mode calm, and make every dashboard screen explain what action to take next.
            </p>
            <div className="letter-note">
              "productivity is not another list. it is the courage to choose the next useful action before the deadline turns into damage."
            </div>
            <p>with focus,</p>
            <h3 style={{ color: 'var(--black)', fontSize: 34, marginTop: 20 }}>Last-Minute Life Saver</h3>
            <p>agentic productivity companion</p>
          </article>
        </section>

        <section id="services" className="section-band">
          <h2 className="headline" style={{ textAlign: 'center', fontSize: 'clamp(62px, 7vw, 104px)', marginBottom: 50 }}>services</h2>
          <div className="service-grid">
            {SERVICES.map(({ title, tags, Icon }) => (
              <article className="service-card" key={title}>
                <Icon size={42} color="var(--sidebar)" />
                <h3>{title}</h3>
                <div className="chip-row">
                  {tags.map(tag => <span className="chip" key={tag}>{tag}</span>)}
                </div>
              </article>
            ))}
            <article className="service-card" style={{ background: 'var(--black)', color: 'var(--cream)' }}>
              <BrandDots />
              <h3>ready to save your week?</h3>
              <Link to="/register" className="yellow-button" style={{ marginTop: 'auto', width: 180 }}>let's plan</Link>
            </article>
          </div>
        </section>

        {/* How it works */}
        <section className="section-band how-section">
          <div className="how-orb how-orb-1" />
          <div className="how-orb how-orb-2" />
          <div className="how-orb how-orb-3" />
          <p className="section-label" style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>the process</p>
          <h2 className="headline" style={{ fontSize: 'clamp(38px, 4vw, 62px)', marginBottom: 8, color: '#fff' }}>how it works</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, marginBottom: 0 }}>four steps from chaos to a clear plan</p>
          <div className="how-grid">
            {HOW_STEPS.map(({ num, title, desc }) => (
              <div className="how-step" key={num}>
                <span className="how-step-num">{num}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-band">
          <div className="awards-header">
            <div className="award-count">
              <span>core flows shipped</span>
              <strong>5+</strong>
            </div>
            <span><span className="mini-tag">2025</span> - <span className="mini-tag">2026</span></span>
          </div>
          <div className="project-list">
            {PROOF_POINTS.map(([name, desc, year]) => (
              <div className="project-row" key={name}>
                <strong>{name}</strong>
                <span>{desc}</span>
                <span>{year}</span>
              </div>
            ))}
          </div>
          <div className="logo-strip">
            <span>stop guessing priorities</span>
            <span>stop missing deadlines</span>
            <span>stop context-switching</span>
            <span>stop the sunday panic</span>
            <span>start shipping on time</span>
          </div>
        </section>

        <section className="section-band">
          <div className="testimonial-cloud">
            {OUTCOMES.map(([name, role, quote, image], index) => (
              <article
                className="testimonial-card"
                key={name}
                style={{
                  top: index === 0 ? 0 : index === 1 ? 310 : index === 2 ? 80 : 450,
                  left: index === 0 ? 0 : index === 1 ? '12%' : 'auto',
                  right: index === 2 ? 0 : index === 3 ? '6%' : 'auto',
                }}
              >
                <h3>{name}</h3>
                <p>{role}</p>
                <img src={image} alt={`${name} portrait`} />
                <p style={{ marginTop: 84 }}>{quote}</p>
              </article>
            ))}
          </div>
          <h2 className="headline" style={{ textAlign: 'center', fontSize: 'clamp(40px, 4vw, 62px)' }}>hear from users who<br />shipped on time</h2>
          <div className="rating-box">
            <strong>4.8<span style={{ fontSize: 14 }}>/5</span></strong>
            <span style={{ color: 'var(--yellow)', display: 'flex', gap: 3 }}><Star size={18} fill="currentColor" /> <Star size={18} fill="currentColor" /> <Star size={18} fill="currentColor" /> <Star size={18} fill="currentColor" /> <Star size={18} fill="currentColor" /></span>
            <span>early users who finished the week with a plan instead of panic.</span>
          </div>
        </section>

        {/* Plans / Pricing */}
        <section id="plans" className="section-band">
          <h2 className="headline" style={{ fontSize: 'clamp(52px, 6vw, 90px)', marginBottom: 8 }}>simple plans</h2>
          <p style={{ color: 'var(--gray)', fontSize: 18 }}>start free. upgrade when the deadline pressure hits.</p>
          <div className="pricing-grid">
            {PLANS.map(plan => (
              <article key={plan.name} className={`pricing-card${plan.featured ? ' featured' : ''}`}>
                {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
                <div className="pricing-name">{plan.name}</div>
                <div className="pricing-price">
                  <strong>{plan.price}</strong>
                  <span>{plan.sub}</span>
                </div>
                <ul className="pricing-features">
                  {plan.features.map(f => (
                    <li key={f.text}>
                      {f.ok
                        ? <CheckCircle size={16} color="var(--success)" />
                        : <X size={16} color="var(--gray-light)" />}
                      <span style={{ opacity: f.ok ? 1 : 0.45 }}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePlanClick(plan)}
                  className={plan.featured ? 'yellow-button' : 'black-button'}
                  style={{ textAlign: 'center', justifyContent: 'center', width: '100%', cursor: 'pointer' }}
                >
                  {isAuthenticated ? `buy ${plan.name}` : plan.cta}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="section-band">
          <div className="contact-envelope-wrap">
            <form className="contact-letter" onSubmit={e => e.preventDefault()}>
              <h2>drop us a note</h2>

              <div className="contact-sentence">
                <span>my name is</span>
                <input className="contact-inline-input" placeholder="your name" />
                <span>, my email address is</span>
                <input className="contact-inline-input" placeholder="you@example.com" type="email" />
              </div>

              <div className="contact-sentence">
                <input className="contact-inline-input" placeholder="topic" />
                <span>, i am contacting you regarding this</span>
              </div>

              <hr className="contact-letter-divider" />

              <label>i want to tell you that:</label>
              <textarea rows={4} placeholder="your message here..." />

              <button className="black-button" type="submit" style={{ marginTop: 28, minHeight: 52 }}>
                send a message
              </button>
            </form>
            <div className="contact-envelope-body">
              <div className="env-fold-left" />
              <div className="env-fold-right" />
              <div className="env-shadow-top" />
            </div>
          </div>
          <footer className="footer-cta">
            <div>
              <h2 className="headline" style={{ color: 'var(--cream)', fontSize: 44, marginBottom: 30 }}>it's time to level up your plan</h2>
              <Link to="/register" className="yellow-button" style={{ minHeight: 44 }}>get started free</Link>
            </div>
            <div>
              <p>Built with LangGraph, Groq, FastAPI &amp; Neon Postgres</p>
              <p style={{ marginTop: 24 }}>open for collaboration &amp;<br />student builder feedback</p>
            </div>
            <div>
              <p>stay in the loop</p>
              <input placeholder="enter email address" />
              <p style={{ marginTop: 20 }}><Mail size={18} /> <Sparkles size={18} /> <CheckCircle2 size={18} /></p>
            </div>
          </footer>
        </section>
      </main>
      {payModal && (
        <PaymentModal
          plan={payModal.plan}
          price={payModal.price}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); navigate('/dashboard') }}
        />
      )}
    </div>
  )
}
