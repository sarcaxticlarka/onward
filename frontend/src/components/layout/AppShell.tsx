import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from '../ErrorBoundary'

export function AppShell() {
  return (
    <div className="app-frame">
      <Sidebar />
      <main className="page-canvas">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
