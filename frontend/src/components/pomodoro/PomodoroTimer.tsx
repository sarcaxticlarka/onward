import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Square, Coffee, Timer, X, Zap } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { toast } from '../ui/Toast'
import type { Task } from '../../types'

interface Props {
  task: Task
  onClose: () => void
}

type Phase = 'work' | 'break'

const WORK_MINS  = 25
const BREAK_MINS = 5

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function CircleProgress({ pct, phase }: { pct: number; phase: Phase }) {
  const r = 80
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - pct)
  return (
    <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={100} cy={100} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10} />
      <circle
        cx={100} cy={100} r={r} fill="none"
        stroke={phase === 'work' ? 'var(--yellow)' : '#86efac'}
        strokeWidth={10}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

export function PomodoroTimer({ task, onClose }: Props) {
  const queryClient = useQueryClient()
  const [phase, setPhase]     = useState<Phase>('work')
  const [secs, setSecs]       = useState(WORK_MINS * 60)
  const [running, setRunning] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessCount, setSessCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSecs = phase === 'work' ? WORK_MINS * 60 : BREAK_MINS * 60
  const pct = 1 - secs / totalSecs

  const startSession = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/pomodoro/start', { task_id: task.id, duration_minutes: WORK_MINS })
      return data
    },
    onSuccess: (d) => setSessionId(d.session_id),
  })

  const completeSession = useMutation({
    mutationFn: async (completed: boolean) => {
      if (!sessionId) return null
      const { data } = await api.post('/pomodoro/complete', { session_id: sessionId, completed })
      return data
    },
    onSuccess: (d) => {
      if (!d) return
      queryClient.invalidateQueries({ queryKey: ['pomodoro', task.id] })
      if (d.xp_awarded) {
        toast({ type: 'xp', title: `+${d.xp_awarded} XP`, message: d.badge ? `Badge unlocked: ${d.badge}!` : 'Pomodoro complete!' })
      }
      if (d.badge) {
        toast({ type: 'success', title: '🏅 Badge unlocked!', message: d.badge === 'first_pomodoro' ? 'First Focus Session' : 'Focus Master (10 sessions)' })
      }
    },
  })

  const tick = useCallback(() => {
    setSecs(prev => {
      if (prev <= 1) {
        // Phase complete
        if (phase === 'work') {
          completeSession.mutate(true)
          setSessCount(c => c + 1)
          setPhase('break')
          setRunning(false)
          setSessionId(null)
          toast({ type: 'success', title: '✓ Focus session complete!', message: `Take a ${BREAK_MINS}-min break — you earned it.`, duration: 5000 })
          return BREAK_MINS * 60
        } else {
          setPhase('work')
          setRunning(false)
          toast({ type: 'info', title: 'Break over!', message: 'Ready for another focus session?' })
          return WORK_MINS * 60
        }
      }
      return prev - 1
    })
  }, [phase])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, tick])

  // Update tab title while running
  useEffect(() => {
    if (running) document.title = `${fmtTime(secs)} — ${phase === 'work' ? '🍅' : '☕'} ${task.title.slice(0, 30)}`
    else document.title = 'LMLS'
    return () => { document.title = 'LMLS' }
  }, [secs, running, phase, task.title])

  const handleStart = () => {
    if (phase === 'work' && !sessionId) startSession.mutate()
    setRunning(true)
  }

  const handlePause = () => setRunning(false)

  const handleStop = () => {
    setRunning(false)
    if (sessionId) completeSession.mutate(false)
    setSessionId(null)
    setSecs(WORK_MINS * 60)
    setPhase('work')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--sidebar)', zIndex: 3000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Close */}
      <button onClick={() => { handleStop(); onClose() }} style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
        <X size={18} />
      </button>

      {/* Session count */}
      <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', gap: 6 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < sessCount % 4 ? 'var(--yellow)' : 'rgba(255,255,255,0.2)' }} />
        ))}
        {sessCount > 0 && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 8 }}>{sessCount} session{sessCount !== 1 ? 's' : ''} today</span>}
      </div>

      {/* Phase label */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: phase === 'work' ? 'var(--yellow)' : '#86efac', fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {phase === 'work' ? <Timer size={16} /> : <Coffee size={16} />}
        {phase === 'work' ? 'focus session' : 'break time'}
      </div>

      {/* Task name */}
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 32, maxWidth: 320, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </p>

      {/* Circle timer */}
      <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 32 }}>
        <CircleProgress pct={pct} phase={phase} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 42, color: '#fff', letterSpacing: '-0.02em' }}>
            {fmtTime(secs)}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {phase === 'work' ? `${WORK_MINS} min focus` : `${BREAK_MINS} min break`}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {!running ? (
          <button
            onClick={handleStart}
            disabled={startSession.isPending}
            style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--yellow)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(45,212,191,0.4)' }}
          >
            <Play size={26} color="var(--sidebar)" fill="var(--sidebar)" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--yellow)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Pause size={26} color="var(--sidebar)" fill="var(--sidebar)" />
          </button>
        )}
        <button
          onClick={handleStop}
          style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Square size={18} color="#fff" fill="#fff" />
        </button>
      </div>

      {/* XP reminder */}
      <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
        <Zap size={14} color="var(--yellow)" />
        +{15} XP for completing this session
      </div>
    </div>
  )
}
