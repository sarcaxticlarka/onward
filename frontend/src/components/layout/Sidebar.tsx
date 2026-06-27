import { Bot, CalendarCheck, AlertTriangle, Users, Star, UserCircle } from 'lucide-react'
import { PortfolioSidebar } from '../brand/PortfolioSidebar'
import { useTaskStore } from '../../stores/taskStore'

function useCrisisCount() {
  const tasks = useTaskStore(s => s.tasks ?? [])
  const overdue = tasks.filter(t => t.status === 'overdue').length
  const urgent  = tasks.filter(t =>
    t.status !== 'completed' &&
    (t.priority === 'critical' || t.priority === 'high') &&
    t.deadline &&
    new Date(t.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000 &&
    new Date(t.deadline).getTime() > Date.now()
  ).length
  return overdue + urgent
}

export function Sidebar() {
  const crisisCount = useCrisisCount()
  const isCrisis    = crisisCount >= 3

  const NAV = [
    {
      to: '/dashboard',
      label: 'dashboard',
      num: '01',
      details: (
        <>
          <span>today's LMLS command</span>
          <span><Bot size={18} /> live agent</span>
        </>
      ),
    },
    { to: '/tasks',     label: 'tasks',     num: '02' },
    { to: '/agent',     label: 'agent',     num: '03' },
    {
      to: '/analytics',
      label: 'analytics',
      num: '04',
      details: (
        <>
          <span>streaks, focus, risk</span>
          <span><CalendarCheck size={18} /> synced</span>
        </>
      ),
    },
    {
      to: '/rooms',
      label: 'rooms',
      num: '05',
      details: (
        <>
          <span>peer accountability</span>
          <span><Users size={18} /> live</span>
        </>
      ),
    },
    {
      to: '/report',
      label: 'report',
      num: '06',
      details: (
        <>
          <span>weekly AI card</span>
          <span><Star size={18} /> new</span>
        </>
      ),
    },
    {
      to: '/crisis',
      label: isCrisis ? '🔴 crisis' : 'crisis',
      num: '07',
      details: isCrisis ? (
        <>
          <span style={{ color: '#ef4444', fontWeight: 700 }}>{crisisCount} urgent tasks!</span>
          <span><AlertTriangle size={18} /></span>
        </>
      ) : (
        <><span>emergency mode</span></>
      ),
    },
    {
      to: '/profile',
      label: 'profile',
      num: '08',
      details: (
        <>
          <span>account & settings</span>
          <span><UserCircle size={18} /></span>
        </>
      ),
    },
  ]

  return (
    <PortfolioSidebar
      items={NAV}
      ctaLabel="ask agent"
      ctaTo="/agent"
      footerLabel="©2026 LMLS."
    />
  )
}
