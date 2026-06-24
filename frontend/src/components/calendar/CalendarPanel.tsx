import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, ExternalLink, Clock, RefreshCw } from 'lucide-react'
import { useCalendarEvents, useCalendarConnect, useCalendarStatus } from '../../hooks/useCalendar'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return iso }
}

function eventDuration(start: string, end: string) {
  try {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`
  } catch { return '' }
}

function isSoon(start: string) {
  const diff = new Date(start).getTime() - Date.now()
  return diff > 0 && diff < 3 * 60 * 60 * 1000
}

export function CalendarPanel() {
  const queryClient = useQueryClient()
  const { data: status, isLoading: statusLoading } = useCalendarStatus()
  const { data: events, isLoading: eventsLoading, refetch } = useCalendarEvents(7)
  const connect = useCalendarConnect()

  const isConnected = status?.connected === true
  const isLoading = statusLoading || (isConnected && eventsLoading)

  // When OAuth popup signals success, invalidate both status and events
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'calendar_connected') {
        queryClient.invalidateQueries({ queryKey: ['calendar'] })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [queryClient])

  const upcomingEvents = Array.isArray(events)
    ? events.filter(e => new Date(e.start) > new Date())
    : []

  return (
    <div style={{
      borderRadius: 16,
      border: `1.5px solid ${isConnected ? 'var(--yellow)' : 'var(--border)'}`,
      overflow: 'hidden',
      background: 'var(--white)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1.5px solid ${isConnected ? 'var(--yellow)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: isConnected ? 'var(--sidebar)' : 'var(--cream-dark)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarCheck size={18} color={isConnected ? 'var(--yellow)' : 'var(--sidebar)'} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: isConnected ? '#fff' : 'var(--black)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Google Calendar
              {isConnected && (
                <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--yellow)', color: 'var(--sidebar)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em' }}>
                  ● CONNECTED
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: isConnected ? 'rgba(255,255,255,0.6)' : 'var(--gray)' }}>
              {isConnected
                ? `${upcomingEvents.length} upcoming event${upcomingEvents.length !== 1 ? 's' : ''} · next 7 days`
                : 'connect to sync your schedule'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {isConnected && (
            <button
              onClick={() => refetch()}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
              title="Refresh events"
            >
              <RefreshCw size={13} />
            </button>
          )}
          {!isConnected && !statusLoading && (
            <button
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: '1.5px solid var(--sidebar)', background: 'var(--sidebar)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ExternalLink size={12} />
              {connect.isPending ? 'opening…' : 'connect'}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: isConnected ? '8px 0 4px' : '0' }}>

        {/* Loading */}
        {isLoading && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />)}
          </div>
        )}

        {/* Not connected */}
        {!isLoading && !isConnected && (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <CalendarCheck size={40} color="var(--gray-light)" style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Calendar not connected</p>
            <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 20, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 20px' }}>
              Connect Google Calendar to see your events here and detect scheduling conflicts with your tasks.
            </p>
            <button
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              className="black-button"
              style={{ minHeight: 46, fontSize: 13 }}
            >
              <CalendarCheck size={15} />
              {connect.isPending ? 'opening Google…' : 'connect Google Calendar'}
            </button>
          </div>
        )}

        {/* Connected — events list */}
        {!isLoading && isConnected && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>
                No upcoming events in the next 7 days.
              </div>
            ) : (
              upcomingEvents.slice(0, 8).map(event => {
                const soon = isSoon(event.start)
                const duration = eventDuration(event.start, event.end)
                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '10px 20px',
                      background: soon ? 'var(--cream-dark)' : 'transparent',
                      borderLeft: soon ? '3px solid var(--yellow)' : '3px solid transparent',
                    }}
                  >
                    <div style={{ flexShrink: 0, marginTop: 5 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: event.source === 'google' ? 'var(--yellow)' : 'var(--blue)',
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--black)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {soon && '⚡ '}{event.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--gray)', flexWrap: 'wrap' }}>
                        <Clock size={10} />
                        <span>{formatTime(event.start)}</span>
                        {duration && (
                          <span style={{ background: 'var(--cream-dark)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {duration}
                          </span>
                        )}
                        {soon && <span style={{ color: 'var(--sidebar)', fontWeight: 700, background: 'var(--yellow)', padding: '1px 6px', borderRadius: 4 }}>soon</span>}
                      </div>
                      {event.description && (
                        <div style={{ fontSize: 11, color: 'var(--gray-light)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.description}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
