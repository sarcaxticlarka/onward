import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-center">
      <h1 className="text-2xl font-semibold text-text-h">Page not found</h1>
      <p className="text-sm text-text">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard">
        <Button size="sm">Back to dashboard</Button>
      </Link>
    </div>
  )
}
