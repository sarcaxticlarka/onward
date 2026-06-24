import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from '../ErrorBoundary'

export function AppShell() {
  const { pathname } = useLocation()
  return (
    <div className="app-frame">
      <Sidebar />
      <main className="page-canvas">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
