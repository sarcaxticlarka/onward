import { Bot, CalendarCheck } from 'lucide-react'
import { PortfolioSidebar } from '../brand/PortfolioSidebar'

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
  { to: '/tasks', label: 'tasks', num: '02' },
  { to: '/agent', label: 'agent', num: '03' },
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
]

export function Sidebar() {
  return (
    <PortfolioSidebar
      items={NAV}
      ctaLabel="ask agent"
      ctaTo="/agent"
      footerLabel="©2026 LMLS."
    />
  )
}
