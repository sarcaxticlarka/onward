import { useEffect } from 'react'
import { CalendarCheck } from 'lucide-react'

export function CalendarConnectedPage() {
  useEffect(() => {
    // If opened in a popup, notify the opener and close
    if (window.opener) {
      window.opener.postMessage({ type: 'calendar_connected' }, '*')
      setTimeout(() => window.close(), 1500)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <CalendarCheck size={52} color="#16a34a" style={{ marginBottom: 16 }} />
        <h2 style={{ fontWeight: 900, fontSize: 24, marginBottom: 8 }}>Calendar connected!</h2>
        <p style={{ color: 'var(--gray)', fontSize: 14 }}>You can close this window and return to the app.</p>
      </div>
    </div>
  )
}
