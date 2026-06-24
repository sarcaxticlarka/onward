import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, CalendarCheck, CheckCircle2, Flame, Mail, Mic, Sparkles, Star, Trophy, Zap } from 'lucide-react'
import { BrandDots, IconStack } from '../components/brand/BrandMarks'
import { PortfolioSidebar } from '../components/brand/PortfolioSidebar'

const NAV = [
  {
    to: '/',
    label: 'projects',
    num: '01',
    details: (
      <>
        <span>Onward command showroom</span>
        <span>8+ agent flows</span>
      </>
    ),
  },
  { to: '/#about', label: 'about', num: '02' },
  { to: '/#services', label: 'services', num: '03' },
  { to: '/#contact', label: 'contact', num: '04' },
]

const PROJECTS = [
  ['finals week autopilot', 'study planner, calendar sync', '2026'],
  ['hackathon sprint plan', '24-hour sprint, agent chat', '2026'],
  ['thesis finish plan', 'subtasks, focus blocks', '2025'],
  ['job interview runway', 'prep plan, nudges', '2025'],
  ['startup launch week', 'conflict detection, crisis mode', '2025'],
]

const SERVICES = [
  { title: 'task capture', tags: ['natural language', 'deadline parsing'], Icon: Zap },
  { title: 'agent planning', tags: ['task decomposition', 'priority scoring'], Icon: Bot },
  { title: 'calendar command', tags: ['conflict detection', 'auto scheduling'], Icon: CalendarCheck },
  { title: 'crisis mode', tags: ['24h backlog reset', 'hour-by-hour plan'], Icon: Flame },
  { title: 'voice commands', tags: ['speak tasks', 'hands-free capture'], Icon: Mic },
]

const AWARDS = [
  ['demo-ready ai agent', 'best autonomous planning flow', '2026'],
  ['deadline impact awards', 'best productivity concept', '2026'],
  ['student builder pick', 'most useful hackathon utility', '2025'],
  ['calendar sync challenge', 'best conflict resolution demo', '2025'],
  ['focus analytics lab', 'clearest productivity dashboard', '2025'],
]

const TESTIMONIALS = [
  ['maya lin', 'student founder', 'it understood my messy week, broke every deliverable into timed blocks, and gave me the first realistic plan i had all semester.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80'],
  ['drew kim', 'hackathon lead', 'we had six tasks due before demo night. the agent found the order, flagged conflicts, and kept the team moving.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80'],
  ['lena torres', 'product manager', 'the crisis plan felt direct, calm, and actionable. no motivational fluff, just what to do next.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80'],
  ['michael rey', 'creative director', 'we finally saw one place for tasks, calendar pressure, agent advice, and progress analytics.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80'],
]

const BLOGS = [
  ['why passive reminders fail at the worst moment', 'agent design', 'jun 20, 2026', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80'],
  ['building crisis mode without panic copy', 'ux design', 'jun 18, 2026', 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600&auto=format&fit=crop&q=80'],
  ['how ai decomposes a vague goal into a real schedule', 'planning', 'jun 12, 2026', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&auto=format&fit=crop&q=80'],
]

export default function LandingPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [])

  return (
    <div className="app-frame">
      <PortfolioSidebar items={NAV} ctaLabel="login" ctaTo="/login" footerLabel="©2026 Onward." />

      <main className="page-canvas">
        <div className="top-status">
          <span className="availability">Onward is available for deadline pressure</span>
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
              Onward is an agentic ai productivity companion that captures messy tasks, decomposes them, schedules focus blocks, resolves conflicts, and escalates before deadlines are missed.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="yellow-button">get started now</Link>
              <Link to="/login" className="black-button">open dashboard</Link>
            </div>
          </div>
        </section>

        <section className="section-band">
          <article className="featured-card">
            <img src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1600&auto=format&fit=crop&q=80" alt="Planner desk with task notes" />
            <span className="feature-label">featured flow</span>
            <div className="featured-meta">
              <h2>the 24-hour Onward plan</h2>
              <p>deadline pressure, calendar conflicts</p>
              <span>2026</span>
            </div>
          </article>

          <div className="project-list">
            {PROJECTS.map(([name, tags, year]) => (
              <div className="project-row" key={name}>
                <strong>{name}</strong>
                <span>{tags}</span>
                <span>{year}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section-band soft-panel">
          <div className="other-projects">
            <h2>other</h2>
            <div>
              <IconStack />
              <Link to="/tasks" className="black-button">view all flows</Link>
            </div>
            <h2>plans</h2>
          </div>
        </section>

        <section id="about" className="section-band">
          <h2 className="bold-statement">
            we do not do vague reminders. just focused, <span className="accent-text">deadline-saving</span> plans that turn pressure into next actions.
          </h2>

          <article className="letter-panel">
            <img className="avatar-pin" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80" alt="Founder portrait" />
            <h2>our journey & vision</h2>
            <p className="accent-text" style={{ fontSize: 28, marginBottom: 70 }}>a note from the builder</p>
            <p>dear friends,</p>
            <p style={{ marginTop: 28 }}>
              Onward exists for the moment when your task list is too loud to organize. it reads the work, splits it into subtasks, finds the calendar space, and shows what deserves attention now.
            </p>
            <p style={{ marginTop: 28 }}>
              the plan for 2026 is direct: make the ai agent trustworthy, make crisis mode calm, and make every dashboard screen explain what action to take next.
            </p>
            <div className="letter-note">
              "productivity is not another list. it is the courage to choose the next useful action before the deadline turns into damage."
            </div>
            <p>with focus,</p>
            <h3 style={{ color: 'var(--black)', fontSize: 34, marginTop: 20 }}>Onward</h3>
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
              <h3>ready to save your week</h3>
              <Link to="/register" className="yellow-button" style={{ marginTop: 'auto', width: 180 }}>let's plan</Link>
            </article>
          </div>
        </section>

        <section className="section-band">
          <div className="awards-header">
            <div className="award-count">
              <span>no. of must-ship flows</span>
              <strong>5+</strong>
            </div>
            <span><span className="mini-tag">2025</span> - <span className="mini-tag">2026</span></span>
          </div>
          <div className="project-list">
            {AWARDS.map(([name, desc, year]) => (
              <div className="project-row" key={name}>
                <strong>{name}</strong>
                <span>{desc}</span>
                <span>{year}</span>
              </div>
            ))}
          </div>
          <div className="logo-strip">
            <span>NexTask</span><span>Groq.Fast</span><span>LangGraph</span><span>Calendar</span><span>Supabase</span><span>React</span>
          </div>
        </section>

        <section className="section-band">
          <div className="testimonial-cloud">
            {TESTIMONIALS.map(([name, role, quote, image], index) => (
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
          <h2 className="headline" style={{ textAlign: 'center', fontSize: 'clamp(40px, 4vw, 62px)' }}>hear from our<br />focused clients</h2>
          <div className="rating-box">
            <strong>4.8<span style={{ fontSize: 14 }}>/5</span></strong>
            <span style={{ color: 'var(--sidebar)', display: 'flex', gap: 3 }}><Star size={18} fill="currentColor" /> <Star size={18} fill="currentColor" /> <Star size={18} fill="currentColor" /> <Star size={18} fill="currentColor" /> <Star size={18} fill="currentColor" /></span>
            <span>56+ times we helped users take the next step.</span>
          </div>
        </section>

        <section className="section-band">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 34 }}>
            <h2 className="headline" style={{ fontSize: 'clamp(38px, 4vw, 60px)' }}>our blog</h2>
            <Link to="/agent">view all notes <ArrowRight size={14} /></Link>
          </div>
          <div className="blog-grid">
            {BLOGS.map(([title, tag, date, image]) => (
              <article className="blog-card" key={title}>
                <h3 style={{ fontSize: 22, margin: 0 }}>{title}</h3>
                <div style={{ borderTop: '2px dashed var(--border)', margin: '20px 0 14px' }} />
                <p><span className="chip">{tag}</span> <span style={{ color: 'var(--gray)', marginLeft: 10 }}>{date}</span></p>
                <img src={image} alt="" style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 6, marginTop: 18 }} />
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="section-band">
          <form className="contact-card">
            <h2 className="headline" style={{ textAlign: 'center', fontSize: 42, marginBottom: 28 }}>drop us a note</h2>
            <input placeholder="my name is" />
            <input placeholder="my email address is" />
            <input placeholder="i am contacting you regarding" />
            <textarea placeholder="i want to tell you that:" rows={5} />
            <button className="black-button" type="button" style={{ minHeight: 54, marginTop: 24 }}>send a message</button>
          </form>
          <footer className="footer-cta">
            <div>
              <h2 className="headline" style={{ color: 'var(--cream)', fontSize: 44, marginBottom: 30 }}>it's time to level up your plan</h2>
              <Link to="/register" className="yellow-button" style={{ minHeight: 44 }}>book a call</Link>
            </div>
            <div>
              <p>hello@example.com<br />+123-456-7890</p>
              <p style={{ marginTop: 24 }}>123 remote work avenue,<br />san francisco, ca 94105</p>
            </div>
            <div>
              <p>join the Onward circle</p>
              <input placeholder="enter email address" />
              <p style={{ marginTop: 20 }}><Mail size={18} /> <Sparkles size={18} /> <CheckCircle2 size={18} /> <Trophy size={18} /></p>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}
