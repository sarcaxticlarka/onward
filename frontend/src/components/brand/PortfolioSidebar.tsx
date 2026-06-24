import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Camera, LogOut, Mail, Menu, Play, SquareUser, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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

function BrandMark() {
  return (
    <>
      <span className="brand-mark-icon">OW</span>
      <span className="sidebar-brand-text">Onward</span>
    </>
  )
}

function scrollCanvas(top: number) {
  const canvas = document.querySelector('.page-canvas')
  if (canvas) canvas.scrollTo({ top, behavior: 'smooth' })
}

function scrollToSection(hash: string) {
  const target = document.getElementById(hash)
  const canvas = document.querySelector('.page-canvas')
  if (target && canvas) {
    canvas.scrollTo({ top: (target as HTMLElement).offsetTop - 40, behavior: 'smooth' })
  }
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
  const [openItem, setOpenItem] = useState(items[0]?.to ?? '')
  const hasHashItems = items.some(i => i.to.includes('#'))
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // suppress scroll-tracking for 700ms after a nav click
  const navClickedAt = useRef(0)

  // Auto-track active section as user scrolls
  useEffect(() => {
    if (!hasHashItems) return
    const canvas = document.querySelector('.page-canvas')
    if (!canvas) return

    const onScroll = () => {
      // ignore scroll events right after a nav click (scroll animation in progress)
      if (Date.now() - navClickedAt.current < 700) return

      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => {
        const canvasEl = canvas as HTMLElement
        if (canvasEl.scrollTop < 180) {
          setOpenItem(items[0]?.to ?? '')
          return
        }
        // Walk hash items in reverse; first one whose offsetTop is above fold wins
        const hashItems = items.filter(i => i.to.includes('#'))
        for (const item of [...hashItems].reverse()) {
          const id = item.to.split('#')[1]
          const el = document.getElementById(id)
          if (el && (el as HTMLElement).offsetTop - 120 <= canvasEl.scrollTop) {
            setOpenItem(item.to)
            return
          }
        }
        setOpenItem(items[0]?.to ?? '')
      }, 60)
    }

    canvas.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      canvas.removeEventListener('scroll', onScroll)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [items, hasHashItems])

  return (
    <aside className={`portfolio-sidebar${menuOpen ? ' menu-open' : ''}`}>
      <div className="sidebar-topline">
        {/* Logo — navigate to home */}
        <Link
          to="/"
          className="sidebar-logo"
          onClick={() => {
            navClickedAt.current = Date.now()
            scrollCanvas(0)
            setOpenItem(items[0]?.to ?? '')
          }}
          aria-label="Go home"
        >
          <BrandMark />
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
        {items.map(item => {
          const isHash = item.to.includes('#')
          const isOpen = openItem === item.to
          const hash = isHash ? item.to.split('#')[1] : ''

          const handleClick = (e: React.MouseEvent) => {
            if (isHash) {
              e.preventDefault()
              navClickedAt.current = Date.now()
              scrollToSection(hash)
            }
            setOpenItem(item.to)
            setMenuOpen(false)
          }

          const className = `sidebar-link${isOpen ? ' open' : ''}`

          if (isHash) {
            return (
              <a key={item.to} href={item.to} className={className} onClick={handleClick}>
                <span className="sidebar-link-head">
                  <strong>{item.label}</strong>
                  <em>{item.num}</em>
                </span>
                {isOpen && item.details && (
                  <span className="sidebar-link-details">{item.details}</span>
                )}
              </a>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={() => `sidebar-link${isOpen ? ' open' : ''}`}
              onClick={handleClick}
            >
              <span className="sidebar-link-head">
                <strong>{item.label}</strong>
                <em>{item.num}</em>
              </span>
              {isOpen && item.details && (
                <span className="sidebar-link-details">{item.details}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <p>turn deadline pressure into a clear plan</p>
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
