import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, LogIn, Copy, Check, Trophy, Flame, Zap, Crown, ArrowRight, LogOut, RefreshCw } from 'lucide-react'
import api from '../lib/api'
import { toast } from '../components/ui/Toast'
import { useAuthStore } from '../stores/authStore'

// ── Types ──────────────────────────────────────────────────────────────────

interface Room { id: string; code: string; name: string; owner_id: string; created_at: string; member_count?: number }
interface Member {
  user_id: string; name: string; avatar?: string
  completed_today: number; total_completed: number; total_xp: number
  current_streak: number; rank: number
}
interface RoomDetail { room: Room; leaderboard: Member[]; is_owner: boolean }

// ── Small helpers ──────────────────────────────────────────────────────────

const RANK_LABELS = ['🥇', '🥈', '🥉']

function RankMedal({ rank }: { rank: number }) {
  if (rank <= 3) return <span style={{ fontSize: 20 }}>{RANK_LABELS[rank - 1]}</span>
  return <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--gray)', width: 28, textAlign: 'center', display: 'inline-block' }}>#{rank}</span>
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ type: 'info', title: 'Room code copied!', message: `Share "${code}" with friends` })
  }
  return (
    <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--cream-dark)', cursor: 'pointer', fontWeight: 800, fontSize: 15, fontFamily: 'monospace', letterSpacing: '0.08em', color: 'var(--sidebar)' }}>
      {code}
      {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="var(--gray)" />}
    </button>
  )
}

// ── Leaderboard view ──────────────────────────────────────────────────────

function LeaderboardView({ data, onLeave, onRefresh, isRefreshing }: {
  data: RoomDetail
  onLeave: () => void
  onRefresh: () => void
  isRefreshing: boolean
}) {
  const { room, leaderboard, is_owner } = data
  const me = useAuthStore(s => s.user)
  const myEntry = leaderboard.find(m => m.user_id === me?.id)

  return (
    <div>
      {/* Room header */}
      <div style={{ borderRadius: 20, background: 'var(--sidebar)', padding: '24px 28px', marginBottom: 20, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: 60, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {is_owner ? '👑 your room' : 'accountability room'}
            </div>
            <h2 style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em', marginBottom: 10 }}>{room.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <CopyCode code={room.code} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>share this code to invite friends</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onRefresh} disabled={isRefreshing} title="Refresh" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              refresh
            </button>
            <button onClick={onLeave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <LogOut size={13} /> leave
            </button>
          </div>
        </div>

        {/* My stats strip */}
        {myEntry && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 24, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            {[
              { icon: <Check size={13} />,  label: 'done today', value: myEntry.completed_today },
              { icon: <Flame size={13} />,  label: 'streak',     value: `${myEntry.current_streak}d` },
              { icon: <Zap size={13} />,    label: 'total XP',   value: myEntry.total_xp },
              { icon: <Trophy size={13} />, label: 'your rank',  value: `#${myEntry.rank}` },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--yellow)', fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', marginBottom: 2 }}>
                  {s.icon} {s.value}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard table */}
      <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px 12px', borderBottom: '1.5px solid var(--border)', background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={16} color="var(--sidebar)" />
          <span style={{ fontWeight: 900, fontSize: 15 }}>Live Leaderboard</span>
          <span style={{ fontSize: 12, color: 'var(--gray)', marginLeft: 4 }}>{leaderboard.length} member{leaderboard.length !== 1 ? 's' : ''}</span>
        </div>

        {leaderboard.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>No members yet.</div>
        ) : (
          <div>
            {leaderboard.map((member, i) => {
              const isMe = member.user_id === me?.id
              const isFirst = i === 0
              return (
                <div key={member.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 22px',
                  borderBottom: i < leaderboard.length - 1 ? '1px solid var(--border)' : 'none',
                  background: isMe ? 'var(--cream-dark)' : isFirst ? '#fffbeb' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  {/* Rank */}
                  <div style={{ width: 32, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <RankMedal rank={member.rank} />
                  </div>

                  {/* Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: isFirst ? '2px solid #f59e0b' : isMe ? '2px solid var(--blue)' : 'none' }}>
                    {member.avatar
                      ? <img src={member.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'var(--yellow)', fontWeight: 900, fontSize: 16 }}>{member.name[0]?.toUpperCase()}</span>
                    }
                  </div>

                  {/* Name + badge */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>{member.name}</span>
                      {isMe && <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--sidebar)', color: 'var(--yellow)', padding: '2px 7px', borderRadius: 10, letterSpacing: '0.06em' }}>YOU</span>}
                      {isFirst && !isMe && <Crown size={14} color="#f59e0b" />}
                    </div>
                    {member.current_streak > 0 && (
                      <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <Flame size={11} /> {member.current_streak}-day streak
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', color: member.completed_today > 0 ? '#16a34a' : 'var(--gray)' }}>
                        {member.completed_today}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>today</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--blue)' }}>{member.total_xp}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>XP</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>{member.total_completed}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>done</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray)', marginTop: 14 }}>
        Leaderboard ranks by tasks completed today, then total XP. Updates every 5 minutes.
      </p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export function RoomsPage() {
  const [activeCode, setActiveCode]   = useState<string | null>(null)
  const [createName, setCreateName]   = useState('')
  const [joinCode, setJoinCode]       = useState('')
  const [view, setView]               = useState<'list' | 'room'>('list')
  const queryClient = useQueryClient()

  // My rooms list
  const { data: myRoomsData, isLoading: loadingRooms } = useQuery({
    queryKey: ['rooms', 'mine'],
    queryFn: async () => { const { data } = await api.get('/rooms/mine'); return data as { rooms: Room[] } },
    staleTime: 30_000,
  })

  // Active room detail
  const { data: roomData, isLoading: loadingRoom, refetch: refetchRoom, isFetching } = useQuery({
    queryKey: ['rooms', activeCode],
    queryFn: async () => { const { data } = await api.get(`/rooms/${activeCode}`); return data as RoomDetail },
    enabled: !!activeCode,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  const createRoom = useMutation({
    mutationFn: async () => { const { data } = await api.post('/rooms', { name: createName.trim() }); return data as { room: Room } },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] })
      setActiveCode(d.room.code)
      setView('room')
      setCreateName('')
      toast({ type: 'success', title: 'Room created!', message: `Share code "${d.room.code}" with friends` })
    },
    onError: (e: any) => toast({ type: 'info', title: 'Error', message: e?.response?.data?.detail || 'Could not create room' }),
  })

  const joinRoom = useMutation({
    mutationFn: async () => { const { data } = await api.post('/rooms/join', { code: joinCode.trim().toUpperCase() }); return data as { room: Room } },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] })
      setActiveCode(d.room.code)
      setView('room')
      setJoinCode('')
      toast({ type: 'success', title: 'Joined!', message: `Welcome to "${d.room.name}"` })
    },
    onError: (e: any) => toast({ type: 'info', title: 'Not found', message: e?.response?.data?.detail || 'Room not found' }),
  })

  const leaveRoom = useMutation({
    mutationFn: async (code: string) => { await api.delete(`/rooms/${code}/leave`) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] })
      queryClient.removeQueries({ queryKey: ['rooms', activeCode] })
      setActiveCode(null)
      setView('list')
      toast({ type: 'info', title: 'Left room', message: 'You have left the room.' })
    },
  })

  const openRoom = (code: string) => { setActiveCode(code); setView('room') }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 60px' }}>
      <div className="top-status">
        <span className="availability">peer rooms live</span>
        <span><span className="mini-tag">compete</span> → <span className="mini-tag">stay accountable</span></span>
      </div>

      {/* Hero */}
      <section className="section-band soft-panel" style={{ paddingTop: 40, paddingBottom: 40, marginBottom: 28 }}>
        <div className="other-projects" style={{ minHeight: 160 }}>
          <h1 className="headline" style={{ fontSize: 'clamp(40px, 5vw, 80px)' }}>do more</h1>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span className="section-label">rooms active</span>
            <span style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--sidebar)' }}>{myRoomsData?.rooms.length ?? 0}</span>
          </div>
          <h1 className="headline" style={{ fontSize: 'clamp(40px, 5vw, 80px)' }}>together.</h1>
        </div>
      </section>

      {view === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* Create room */}
          <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={18} color="var(--yellow)" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>Create a room</div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>Get a shareable 6-letter code</div>
              </div>
            </div>
            <input
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createName.trim() && createRoom.mutate()}
              placeholder='Room name, e.g. "CS Study Group"'
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }}
            />
            <button
              onClick={() => createRoom.mutate()}
              disabled={!createName.trim() || createRoom.isPending}
              className="black-button"
              style={{ width: '100%', justifyContent: 'center', minHeight: 44, opacity: !createName.trim() ? 0.4 : 1 }}
            >
              <Plus size={15} /> {createRoom.isPending ? 'creating…' : 'create room'}
            </button>
          </div>

          {/* Join room */}
          <div style={{ borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogIn size={18} color="var(--sidebar)" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>Join a room</div>
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>Enter a code from a friend</div>
              </div>
            </div>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinCode.trim() && joinRoom.mutate()}
              placeholder='6-letter code, e.g. "AB3X7K"'
              maxLength={8}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 15, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, boxSizing: 'border-box' }}
            />
            <button
              onClick={() => joinRoom.mutate()}
              disabled={!joinCode.trim() || joinRoom.isPending}
              className="black-button"
              style={{ width: '100%', justifyContent: 'center', minHeight: 44, opacity: !joinCode.trim() ? 0.4 : 1 }}
            >
              <LogIn size={15} /> {joinRoom.isPending ? 'joining…' : 'join room'}
            </button>
          </div>

          {/* My rooms */}
          {!loadingRooms && myRoomsData && myRoomsData.rooms.length > 0 && (
            <div style={{ gridColumn: '1 / -1', borderRadius: 16, border: '1.5px solid var(--border)', background: 'var(--white)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px 12px', borderBottom: '1.5px solid var(--border)', background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={16} color="var(--sidebar)" />
                <span style={{ fontWeight: 900, fontSize: 15 }}>Your rooms</span>
              </div>
              {myRoomsData.rooms.map(room => (
                <div key={room.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: '1px solid var(--border)', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{room.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--sidebar)' }}>{room.code}</span>
                      <span>·</span>
                      <span>{room.member_count ?? '?'} member{room.member_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <button onClick={() => openRoom(room.code)} className="pill" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    open <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {loadingRooms && (
            <div style={{ gridColumn: '1 / -1' }}>
              {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 10, borderRadius: 12 }} />)}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
            ← back to rooms
          </button>

          {loadingRoom && (
            <div>
              <div className="skeleton" style={{ height: 180, borderRadius: 20, marginBottom: 20 }} />
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 10, borderRadius: 12 }} />)}
            </div>
          )}

          {roomData && (
            <LeaderboardView
              data={roomData}
              onLeave={() => leaveRoom.mutate(activeCode!)}
              onRefresh={() => refetchRoom()}
              isRefreshing={isFetching}
            />
          )}
        </div>
      )}
    </div>
  )
}
