import { Moon, Sun, LogOut } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { useLogout } from '../../hooks/useAuth'
import { Button } from '../ui/Button'

export function Topbar() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const user = useAuthStore((state) => state.user)
  const logoutMutation = useLogout()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="text-sm text-text">{user?.email}</div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          aria-label="Logout"
        >
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  )
}
