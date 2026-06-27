import { useState } from 'react'
import { ArrowRight, Mic, Plus, Sparkles } from 'lucide-react'
import { TaskList } from '../components/tasks/TaskList'
import { AddTaskModal } from '../components/tasks/AddTaskModal'
import { VoiceTaskInput } from '../components/tasks/VoiceTaskInput'
import { TemplateModal } from '../components/tasks/TemplateModal'
import { useTaskStore } from '../stores/taskStore'
import { useTasksQuery } from '../hooks/useTasks'
import { IconStack } from '../components/brand/BrandMarks'

export function TasksPage() {
  const [modalOpen, setModalOpen]       = useState(false)
  const [voiceOpen, setVoiceOpen]       = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  useTasksQuery()
  const tasks = useTaskStore(s => s.tasks)
  const total     = tasks.length
  const completed = tasks.filter(t => t.status === 'completed').length
  const pending   = tasks.filter(t => t.status === 'pending').length

  return (
    <div>
      <div className="top-status">
        <span className="availability">LMLS task parser ready</span>
        <span><span className="mini-tag">capture</span> → <span className="mini-tag">decompose</span></span>
      </div>

      <section className="section-band soft-panel" style={{ paddingTop: 48, paddingBottom: 48, marginBottom: 34 }}>
        <div className="other-projects" style={{ minHeight: 300 }}>
          <h1 className="headline" style={{ fontSize: 'clamp(56px, 7vw, 112px)' }}>tasks</h1>
          <div>
            <IconStack />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setVoiceOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 20px', minHeight: 58, borderRadius: 14, border: 'none', background: 'var(--yellow)', color: 'var(--sidebar)', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}
              >
                <Mic size={18} /> voice
              </button>
              <button
                onClick={() => setTemplateOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 20px', minHeight: 58, borderRadius: 14, border: '2px solid var(--sidebar)', background: 'var(--cream-dark)', color: 'var(--sidebar)', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}
              >
                <Sparkles size={18} /> templates
              </button>
              <button
                onClick={() => setModalOpen(true)}
                className="black-button"
                style={{ minHeight: 58 }}
              >
                add task <Plus size={18} />
              </button>
            </div>
          </div>
          <h1 className="headline" style={{ fontSize: 'clamp(56px, 7vw, 112px)' }}>planned</h1>
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="section-label">manage work</p>
          <h2 className="headline" style={{ fontSize: 'clamp(38px, 4vw, 64px)' }}>your task backlog.</h2>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="yellow-button"
          style={{ minHeight: 54, alignSelf: 'flex-end' }}
        >
          <Plus size={16} /> add task
        </button>
      </div>

      <div className="metric-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'total', value: total },
          { label: 'pending', value: pending },
          { label: 'done', value: completed },
          { label: 'completion', value: total ? `${Math.round(completed/total*100)}%` : '0%' },
        ].map(s => (
          <article className="metric-card" key={s.label}>
            <strong>{s.value}</strong>
            <span className="section-label">{s.label}</span>
          </article>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <span style={{ color: 'var(--gray)' }}>agent can turn one sentence into a scheduled plan <ArrowRight size={14} /></span>
      </div>
      <TaskList />
      <AddTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
      {voiceOpen    && <VoiceTaskInput  onClose={() => setVoiceOpen(false)} />}
      {templateOpen && <TemplateModal   onClose={() => setTemplateOpen(false)} />}
    </div>
  )
}
