import { Bot, CalendarCheck, CheckCircle2, Clock3, Flame, Mail, Sparkles, Trophy, Zap } from 'lucide-react'

type FlowerMarkProps = {
  size?: number
}

export function FlowerMark({ size = 36 }: FlowerMarkProps) {
  const petal = size * 0.34
  const center = size * 0.18

  return (
    <span className="flower-mark" style={{ width: size, height: size }}>
      <span style={{ width: petal, height: petal, top: 0, left: '50%', transform: 'translateX(-50%)' }} />
      <span style={{ width: petal, height: petal, right: 0, top: '50%', transform: 'translateY(-50%)' }} />
      <span style={{ width: petal, height: petal, bottom: 0, left: '50%', transform: 'translateX(-50%)' }} />
      <span style={{ width: petal, height: petal, left: 0, top: '50%', transform: 'translateY(-50%)' }} />
      <strong style={{ width: center, height: center }} />
    </span>
  )
}

export function RingMark({ size = 36 }: FlowerMarkProps) {
  return <span className="ring-mark" style={{ width: size, height: size }} />
}

export function IconStack({ compact = false }: { compact?: boolean }) {
  return (
    <div className="icon-stack" aria-hidden="true">
      <div className="tilt-card">
        <Bot size={compact ? 22 : 30} />
      </div>
      <div className="tilt-card">
        <CalendarCheck size={compact ? 22 : 30} />
      </div>
      <div className="tilt-card">
        <Flame size={compact ? 22 : 30} />
      </div>
    </div>
  )
}

export function BrandDots() {
  return (
    <div className="brand-dots" aria-label="Onward">
      <FlowerMark />
      <RingMark />
      <FlowerMark />
    </div>
  )
}

export const statusIcons = {
  capture: Zap,
  plan: Bot,
  schedule: CalendarCheck,
  alert: Flame,
  win: Trophy,
  done: CheckCircle2,
  time: Clock3,
  mail: Mail,
  spark: Sparkles,
}
