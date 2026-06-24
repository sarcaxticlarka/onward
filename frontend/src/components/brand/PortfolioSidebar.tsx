import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Camera, LogOut, Mail, Menu, Play, SquareUser, X } from 'lucide-react'
import { useState } from 'react'
import { BrandDots } from './BrandMarks'
import { useAuthStore } from '../../stores/authStore'
import { useLogout } from '../../hooks/useAuth'

export type SidebarItem = {
  to: string
  label: string
  num: string
  details?: ReactNode
}

type PortfolioSidebarProps = {
  items: SidebarItem[]
  ctaLabel?: string
  ctaTo?: string
  footerLabel?: string
}

export function PortfolioSidebar({
  items,
  ctaLabel = 'login',
  ctaTo = '/login',
  footerLabel = '©2026 Onward.',
}: PortfolioSidebarProps) {
  const user = useAuthStore(s => s.user)
  const logout = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <aside className={`portfolio-sidebar${menuOpen ? ' menu-open' : ''}`}>
      <div className="sidebar-topline">
        <Link to="/" className="sidebar-logo" aria-label="Onward home">
          <BrandDots />
        </Link>
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuOpen(open => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <span className="sidebar-link-head">
              <strong>{item.label}</strong>
              <em>{item.num}</em>
            </span>
            {item.details && <span className="sidebar-link-details">{item.details}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <p>turn deadline pressure into a clear Onward plan</p>
        <Link to={ctaTo} className="black-button" onClick={() => setMenuOpen(false)}>{ctaLabel}</Link>
        {user && (
          <button className="sidebar-logout" onClick={() => logout.mutate()}>
            <LogOut size={14} />
            sign out
          </button>
        )}
        <div className="sidebar-footer">
          <span>{footerLabel}</span>
          <span className="sidebar-socials" aria-hidden="true">
            <Camera size={18} />
            <X size={20} />
            <Play size={18} />
            <SquareUser size={17} />
            <Mail size={17} />
          </span>
        </div>
      </div>
    </aside>
  )
}
