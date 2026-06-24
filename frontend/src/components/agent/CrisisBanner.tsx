import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useAgentStore } from '../../stores/agentStore'
import { Button } from '../ui/Button'
import api from '../../lib/api'

export function CrisisBanner() {
  const isCrisisMode = useAgentStore((state) => state.isCrisisMode)
  const setCrisisMode = useAgentStore((state) => state.setCrisisMode)
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 * 60)

  const triggerCrisis = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/agent/crisis')
      return data
    },
    onSuccess: () => setCrisisMode(true),
  })

  useEffect(() => {
    if (!isCrisisMode) return undefined
    if (Notification?.permission === 'default') {
      Notification.requestPermission()
    } else if (Notification?.permission === 'granted') {
      new Notification('Crisis Mode activated', {
        body: 'The agent is reprioritizing your backlog.',
      })
    }
    const interval = setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [isCrisisMode])

  if (!isCrisisMode) {
    return (
      <Button size="sm" variant="danger" onClick={() => triggerCrisis.mutate()}>
        <AlertTriangle size={14} />
        Trigger Crisis Mode
      </Button>
    )
  }

  const hours = Math.floor(secondsLeft / 3600)
  const minutes = Math.floor((secondsLeft % 3600) / 60)

  return (
    <div className="flex items-center justify-between rounded-xl border border-danger bg-danger/10 px-4 py-3 text-danger">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} />
        <span className="font-medium">
          Crisis Mode: {hours}h {minutes}m remaining — Battle Plan active
        </span>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setCrisisMode(false)} aria-label="Dismiss">
        <X size={16} />
      </Button>
    </div>
  )
}
