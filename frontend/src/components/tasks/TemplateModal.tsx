import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, ChevronRight, Check, Clock, Sparkles } from 'lucide-react'
import api from '../../lib/api'
import { toast } from '../ui/Toast'

interface Template {
  id: string; label: string; emoji: string; description: string
  estimated_days: number; category: string; subtask_count: number
}

interface Props { onClose: () => void }

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low',      color: '#6b7280' },
  { value: 'medium',   label: 'Medium',   color: '#2563eb' },
  { value: 'high',     label: 'High',     color: '#ea580c' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
]

const SUBTASK_PREVIEWS: Record<string, string[]> = {
  research_paper:  ['Define research question', 'Find & review 10+ sources', 'Write first draft', '+ 4 more steps'],
  coding_project:  ['Define requirements', 'Set up repo', 'Implement core feature', '+ 3 more steps'],
  exam_prep:       ['Review syllabus', 'Compile notes', 'Practice with past papers', '+ 3 more steps'],
  job_application: ['Research company', 'Tailor resume', 'Write cover letter', '+ 3 more steps'],
  presentation:    ['Define audience & message', 'Build slides', 'Rehearse 2×', '+ 3 more steps'],
  group_project:   ['Kickoff meeting', 'Assign roles & timeline', 'Individual work', '+ 3 more steps'],
}

export function TemplateModal({ onClose }: Props) {
  const [selected, setSelected] = useState<Template | null>(null)
  const [title, setTitle]       = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState('medium')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['task-templates'],
    queryFn: async () => {
      const { data } = await api.get<{ templates: Template[] }>('/tasks/templates')
      return data.templates
    },
    staleTime: Infinity,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/tasks/from-template', {
        template_id: selected!.id,
        title: title.trim(),
        deadline:  deadline || null,
        priority,
      })
      return data
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast({
        type: 'success',
        title: `${selected!.emoji} Template applied!`,
        message: `"${res.parent.title}" + ${res.count} subtasks created`,
        duration: 4000,
      })
      onClose()
    },
    onError: (e: any) => {
      toast({ type: 'info', title: 'Error', message: e?.response?.data?.detail || 'Could not create tasks' })
    },
  })

  const canCreate = selected && title.trim()

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 680, background: 'var(--white)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'var(--sidebar)', padding: '20px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Smart Templates</div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', marginTop: 2 }}>
              <Sparkles size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--yellow)' }} />
              Pick a template
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} color="var(--sidebar)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Template grid */}
              <div style={{ padding: '22px 26px 16px' }}>
                <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16 }}>
                  Select a template — we'll create the parent task plus a ready-made subtask checklist.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                  {(data ?? []).map(tpl => {
                    const isActive = selected?.id === tpl.id
                    const previews = SUBTASK_PREVIEWS[tpl.id] ?? []
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => { setSelected(tpl); if (!title) setTitle(tpl.label) }}
                        style={{
                          textAlign: 'left', borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                          border: `2px solid ${isActive ? 'var(--sidebar)' : 'var(--border)'}`,
                          background: isActive ? 'var(--cream-dark)' : 'var(--white)',
                          transition: 'border 0.15s, background 0.15s',
                          position: 'relative',
                        }}
                      >
                        {isActive && (
                          <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: 'var(--sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={11} color="#fff" strokeWidth={3} />
                          </div>
                        )}
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{tpl.emoji}</div>
                        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4, letterSpacing: '-0.01em' }}>{tpl.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 10, lineHeight: 1.4 }}>{tpl.description}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sidebar)', background: 'rgba(26,14,48,0.07)', padding: '2px 8px', borderRadius: 10 }}>
                            {tpl.subtask_count} steps
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--gray)', fontWeight: 600 }}>
                            <Clock size={10} /> ~{tpl.estimated_days}d
                          </span>
                        </div>

                        {/* Subtask preview on hover / selected */}
                        {isActive && previews.length > 0 && (
                          <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                            {previews.map((p, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gray)', marginBottom: 3 }}>
                                <ChevronRight size={10} /> {p}
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Config form — only show when a template is selected */}
              {selected && (
                <div style={{ padding: '0 26px 26px', borderTop: '1.5px solid var(--border)', paddingTop: 22 }}>
                  <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 16 }}>
                    Customise <strong>{selected.emoji} {selected.label}</strong> before creating:
                  </p>

                  {/* Title */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Task title</label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder={`e.g. "${selected.label} for Bio 201"`}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                    {/* Deadline */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Deadline (optional)</label>
                      <input
                        type="datetime-local"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Priority</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {PRIORITY_OPTIONS.map(p => (
                          <button
                            key={p.value}
                            onClick={() => setPriority(p.value)}
                            style={{
                              padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              border: `1.5px solid ${priority === p.value ? p.color : 'var(--border)'}`,
                              background: priority === p.value ? p.color + '18' : 'transparent',
                              color: priority === p.value ? p.color : 'var(--gray)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!canCreate || createMutation.isPending}
                    className="black-button"
                    style={{ width: '100%', justifyContent: 'center', minHeight: 50, fontSize: 15, opacity: canCreate ? 1 : 0.4 }}
                  >
                    {createMutation.isPending
                      ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> creating {selected.subtask_count + 1} tasks…</>
                      : <><Sparkles size={16} /> create {selected.emoji} {selected.label} + {selected.subtask_count} subtasks</>
                    }
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
