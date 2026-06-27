import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, CheckSquare, Flame, ArrowRight, RefreshCw, X, Zap } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { useTaskStore } from '../stores/taskStore'
import type { Task } from '../types'
import { useTasksQuery } from '../hooks/useTasks'
import { useUpdateTask } from '../hooks/useTasks'
import { toast } from '../components/ui/Toast'

interface HourSlot { time: string; action: string; task_id: string | null }
interface BattlePlan {
  hour_by_hour: HourSlot[]
  deprioritized: Array<{ task_id: string; reason: string }>
  message: string
  xp_awarded?: number
}
interface CrisisResponse {
  crisis: boolean
  triggering_tasks: Array<{ id: string; title: string; deadline: string }>
  battle_plan: BattlePlan
}

function useCountdown(deadline: string) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
      setSecs(diff)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [deadline])
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return { h, m, s, expired: secs === 0 }
}

function CountdownBadge({ deadline }: { deadline: string }) {
  const { h, m, s, expired } = useCountdown(deadline)
  const urgent = h < 2
  return (
    <span style={{
      fontFamily: 'monospace', fontWeight: 900, fontSize: 13,
      color: expired ? '#fff' : urgent ? '#fee2e2' : 'rgba(255,255,255,0.8)',
      background: expired ? '#dc2626' : urgent ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.1)',
      padding: '3px 10px', borderRadius: 8, letterSpacing: '0.04em',
    }}>
      {expired ? 'OVERDUE' : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
    </span>
  )
}

function PulsingDot() {
  return (
    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ef4444', marginRight: 8, animation: 'pulse 1.2s ease-in-out infinite' }} />
  )
}

export function CrisisPage() {
  const navigate = useNavigate()
  const { isLoading: tasksLoading } = useTasksQuery()
  const tasks = useTaskStore(s => s.tasks ?? [])
  const updateTask = useUpdateTask()
  const [plan, setPlan] = useState<CrisisResponse | null>(null)
  const [dismissed] = useState(false)

  const overdueTasks = tasks.filter(t => t.status === 'overdue')
  const urgentTasks  = tasks.filter(t =>
    t.status !== 'completed' &&
    (t.priority === 'critical' || t.priority === 'high') &&
    t.deadline &&
    new Date(t.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
    new Date(t.deadline).getTime() > Date.now()
  )
  const crisisTasks = [...overdueTasks, ...urgentTasks]
  const isCrisis = crisisTasks.length >= 3

  const triggerCrisis = useMutation({
    mutationFn: async (force?: boolean) => {
      const { data } = await api.post<CrisisResponse>('/agent/crisis', { force: force ?? false })
      return data
    },
    onSuccess: (data) => {
      setPlan(data)
      if (data.battle_plan?.xp_awarded) {
        toast({ type: 'xp', title: `+${data.battle_plan.xp_awarded} XP`, message: 'Crisis plan generated!' })
      }
    },
  })

  // Auto-trigger plan on load if in crisis
  useEffect(() => {
    if (!tasksLoading && isCrisis && !plan && !triggerCrisis.isPending) {
      triggerCrisis.mutate(false)
    }
  }, [tasksLoading, isCrisis])

  const markDone = (taskId: string, title: string) => {
    updateTask.mutate({ id: taskId, patch: { status: 'completed' } })
    toast({ type: 'success', title: '✓ Task completed', message: `"${title.slice(0, 40)}" — crisis task cleared!`, duration: 3500 })
  }

  if (!isCrisis && !dismissed) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckSquare size={32} color="#16a34a" />
        </div>
        <h2 style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', marginBottom: 8 }}>You're not in crisis</h2>
        <p style={{ color: 'var(--gray)', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
          Crisis Mode activates automatically when you have 3+ overdue or high-priority tasks due in the next 24 hours.
          Right now you have <strong>{overdueTasks.length} overdue</strong> and <strong>{urgentTasks.length} urgent</strong> tasks.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/dashboard')} className="black-button" style={{ minHeight: 46 }}>
            ← back to dashboard
          </button>
          <button
            onClick={() => triggerCrisis.mutate(true)}
            disabled={triggerCrisis.isPending}
            style={{ minHeight: 46, padding: '0 20px', borderRadius: 12, border: '1.5px solid #dc2626', background: 'none', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <AlertTriangle size={15} />
            {triggerCrisis.isPending ? 'generating…' : 'force activate (demo)'}
          </button>
        </div>
        {plan && <CrisisDashboard plan={plan} crisisTasks={crisisTasks} tasks={tasks} onMarkDone={markDone} onRefresh={() => triggerCrisis.mutate(true)} isRefreshing={triggerCrisis.isPending} />}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 0 80px' }}>
      {/* Crisis header */}
      <div style={{ background: 'var(--sidebar)', borderRadius: '0 0 20px 20px', padding: '24px 28px 28px', marginBottom: 28, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} color="#fff" />
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <PulsingDot />crisis mode active
              </div>
              <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', marginTop: 2 }}>
                {crisisTasks.length} tasks need immediate attention
              </h1>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 14px', color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <X size={14} /> exit crisis
          </button>
        </div>

        {/* AI message */}
        {plan?.battle_plan?.message && (
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Zap size={16} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {plan.battle_plan.message}
              </p>
            </div>
          </div>
        )}

        {triggerCrisis.isPending && (
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, marginTop: plan?.battle_plan?.message ? 10 : 0 }}>
            <RefreshCw size={16} color="var(--yellow)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>AI is generating your survival plan…</span>
          </div>
        )}
      </div>

      {plan && <CrisisDashboard plan={plan} crisisTasks={crisisTasks} tasks={tasks} onMarkDone={markDone} onRefresh={() => triggerCrisis.mutate(true)} isRefreshing={triggerCrisis.isPending} />}

      {!plan && !triggerCrisis.isPending && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <button onClick={() => triggerCrisis.mutate(false)} className="black-button" style={{ minHeight: 50 }}>
            <Zap size={16} /> generate survival plan
          </button>
        </div>
      )}
    </div>
  )
}

function CrisisDashboard({ plan, crisisTasks, tasks, onMarkDone, onRefresh, isRefreshing }: {
  plan: CrisisResponse
  crisisTasks: Task[]
  tasks: Task[]
  onMarkDone: (id: string, title: string) => void
  onRefresh: () => void
  isRefreshing: boolean
}) {
  const bp = plan.battle_plan

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

      {/* Left: crisis tasks + hour-by-hour */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Crisis tasks with live countdowns */}
        <div style={{ borderRadius: 16, border: '1.5px solid #fecaca', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: '#fee2e2', borderBottom: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} /> Tasks needing immediate action
            </div>
            <button onClick={onRefresh} disabled={isRefreshing} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
          <div>
            {crisisTasks.length === 0 && (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--gray)', fontSize: 14 }}>
                No crisis tasks right now — you're clear!
              </div>
            )}
            {crisisTasks.map((task: Task, i: number) => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                borderBottom: i < crisisTasks.length - 1 ? '1px solid #fee2e2' : 'none',
                background: task.status === 'overdue' ? '#fff5f5' : '#fff',
              }}>
                <button
                  onClick={() => onMarkDone(task.id, task.title)}
                  style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: '2px solid #dc2626', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <CheckSquare size={13} color="#dc2626" />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: task.priority === 'critical' ? '#fef2f2' : '#fef3c7', color: task.priority === 'critical' ? '#dc2626' : '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                      {task.priority?.toUpperCase()}
                    </span>
                    {task.status === 'overdue' && <span style={{ color: '#dc2626', fontWeight: 700 }}>OVERDUE</span>}
                  </div>
                </div>
                {task.deadline && <CountdownBadge deadline={task.deadline} />}
              </div>
            ))}
          </div>
        </div>

        {/* Hour-by-hour schedule */}
        {bp?.hour_by_hour?.length > 0 && (
          <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: 'var(--sidebar)', borderBottom: '1.5px solid var(--border)' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={15} color="var(--yellow)" /> Hour-by-hour recovery schedule
              </div>
            </div>
            <div>
              {bp.hour_by_hour.map((slot, i) => {
                const linkedTask = slot.task_id ? tasks.find((t: Task) => t.id === slot.task_id) : null
                const isDone = linkedTask?.status === 'completed'
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 20px',
                    borderBottom: i < bp.hour_by_hour.length - 1 ? '1px solid var(--border)' : 'none',
                    background: isDone ? '#f0fdf4' : 'transparent',
                    opacity: isDone ? 0.6 : 1,
                  }}>
                    <div style={{ flexShrink: 0, background: 'var(--cream-dark)', borderRadius: 8, padding: '4px 10px', fontFamily: 'monospace', fontWeight: 900, fontSize: 13, color: 'var(--sidebar)', minWidth: 56, textAlign: 'center' }}>
                      {slot.time}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isDone ? '#16a34a' : 'var(--black)', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {isDone ? '✓ ' : ''}{slot.action}
                      </div>
                      {linkedTask && !isDone && (
                        <button
                          onClick={() => onMarkDone(linkedTask.id, linkedTask.title)}
                          style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: 'var(--sidebar)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          mark done <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar: deprioritized + stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Crisis stats */}
        <div style={{ borderRadius: 16, border: '1.5px solid #fecaca', padding: '18px 20px', background: '#fff5f5' }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#991b1b', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={15} /> Crisis Stats
          </div>
          {[
            { label: 'Overdue tasks', value: crisisTasks.filter((t: Task) => t.status === 'overdue').length, color: '#dc2626' },
            { label: 'Due in 24h', value: crisisTasks.filter((t: Task) => t.status !== 'overdue').length, color: '#f97316' },
            { label: 'Deprioritized', value: bp?.deprioritized?.length ?? 0, color: 'var(--gray)' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--gray)' }}>{s.label}</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: s.color }}>{String(s.value).padStart(2, '0')}</span>
            </div>
          ))}
        </div>

        {/* Deprioritized tasks */}
        {bp?.deprioritized?.length > 0 && (
          <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--cream-dark)', borderBottom: '1.5px solid var(--border)' }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Deprioritized for now</div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>AI says focus on crisis tasks first</div>
            </div>
            <div>
              {bp.deprioritized.map((item, i) => {
                const t = tasks.find((x: Task) => x.id === item.task_id)
                if (!t) return null
                return (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: i < bp.deprioritized.length - 1 ? '1px solid var(--border)' : 'none', opacity: 0.7 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', lineHeight: 1.4 }}>{item.reason}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Regenerate plan */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{ width: '100%', minHeight: 46, borderRadius: 12, border: '1.5px solid var(--border)', background: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--sidebar)' }}
        >
          <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          {isRefreshing ? 'regenerating…' : 'regenerate plan'}
        </button>
      </div>
    </div>
  )
}
