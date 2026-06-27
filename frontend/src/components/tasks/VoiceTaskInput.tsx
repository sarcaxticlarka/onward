import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2, X, Check } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { toast } from '../ui/Toast'

interface Props { onClose: () => void }

type State = 'idle' | 'recording' | 'processing' | 'done' | 'error'

export function VoiceTaskInput({ onClose }: Props) {
  const [recState, setRecState] = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [errMsg, setErrMsg]         = useState('')
  const [seconds, setSeconds]       = useState(0)
  const [volume, setVolume]         = useState(0)

  const mediaRef    = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<BlobPart[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animRef     = useRef<number>(0)
  const queryClient = useQueryClient()

  // Volume visualiser
  const trackVolume = (stream: MediaStream) => {
    const ctx      = new AudioContext()
    const src      = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    analyserRef.current = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)
    const loop = () => {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setVolume(Math.min(100, avg * 2))
      animRef.current = requestAnimationFrame(loop)
    }
    loop()
  }

  const startRecording = async () => {
    setErrMsg('')
    setTranscript('')
    setSeconds(0)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      trackVolume(stream)
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        cancelAnimationFrame(animRef.current)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        uploadAudio(blob)
      }
      mr.start(200)
      mediaRef.current = mr
      setRecState('recording')
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      setErrMsg('Microphone access denied. Please allow mic access and try again.')
      setRecState('error')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRef.current?.stop()
    setRecState('processing')
  }

  const uploadMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const fd = new FormData()
      fd.append('audio', blob, 'recording.webm')
      const { data } = await api.post('/tasks/voice', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: (task) => {
      setTranscript(task.description?.replace(/^Voice: "?|"?$/g, '') || task.title)
      setRecState('done')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast({ type: 'success', title: '🎤 Voice task created!', message: `"${task.title.slice(0, 50)}"`, duration: 4000 })
    },
    onError: (err: any) => {
      setErrMsg(err?.response?.data?.detail || 'Transcription failed. Please try again.')
      setRecState('error')
    },
  })
  const uploadAudio = uploadMutation.mutate

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    cancelAnimationFrame(animRef.current)
    mediaRef.current?.stop()
  }, [])

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3000, padding: 20,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--white)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ background: 'var(--sidebar)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Voice Input</div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', marginTop: 2 }}>Speak your task</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '32px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

          {/* Mic button + visualiser */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Ripple rings when recording */}
            {recState === 'recording' && [1.4, 1.7, 2.0].map((scale, i) => (
              <div key={i} style={{
                position: 'absolute', borderRadius: '50%',
                width: 80, height: 80,
                border: '2px solid var(--sidebar)',
                transform: `scale(${scale + (volume / 100) * 0.3})`,
                opacity: 0.15 + (i * 0.05),
                transition: 'transform 0.1s ease, opacity 0.1s',
              }} />
            ))}

            <button
              onClick={recState === 'idle' || recState === 'error' ? startRecording : stopRecording}
              disabled={recState === 'processing'}
              style={{
                width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: recState === 'processing' ? 'not-allowed' : 'pointer',
                background: recState === 'recording' ? '#dc2626' : recState === 'done' ? '#16a34a' : 'var(--sidebar)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: recState === 'recording' ? '0 0 0 4px rgba(220,38,38,0.3)' : '0 4px 24px rgba(26,14,48,0.3)',
                transition: 'background 0.2s, box-shadow 0.2s',
                position: 'relative', zIndex: 1,
              }}
            >
              {recState === 'processing' && <Loader2 size={32} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />}
              {recState === 'recording' && <Square size={28} color="#fff" fill="#fff" />}
              {recState === 'done'      && <Check  size={32} color="#fff" />}
              {(recState === 'idle' || recState === 'error') && <Mic size={32} color="var(--yellow)" />}
            </button>
          </div>

          {/* Status text */}
          <div style={{ textAlign: 'center' }}>
            {recState === 'idle' && (
              <>
                <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Tap to start recording</p>
                <p style={{ color: 'var(--gray)', fontSize: 13, lineHeight: 1.5 }}>
                  Say something like:<br />
                  <em>"Submit the chemistry assignment by Friday at 11pm, high priority"</em>
                </p>
              </>
            )}
            {recState === 'recording' && (
              <>
                <p style={{ fontWeight: 900, fontSize: 18, color: '#dc2626', marginBottom: 6, fontFamily: 'monospace' }}>
                  {fmtTime(seconds)} — recording
                </p>
                <p style={{ color: 'var(--gray)', fontSize: 13 }}>Tap the button to stop</p>
                {/* Volume bar */}
                <div style={{ width: 200, height: 4, background: 'var(--border)', borderRadius: 4, margin: '12px auto 0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${volume}%`, background: '#dc2626', borderRadius: 4, transition: 'width 0.1s' }} />
                </div>
              </>
            )}
            {recState === 'processing' && (
              <>
                <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Transcribing…</p>
                <p style={{ color: 'var(--gray)', fontSize: 13 }}>AI is parsing your task details</p>
              </>
            )}
            {recState === 'done' && transcript && (
              <>
                <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: '#16a34a' }}>✓ Task created!</p>
                <div style={{ background: 'var(--cream-dark)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--black)', lineHeight: 1.5, textAlign: 'left' }}>
                  <span style={{ color: 'var(--gray)', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>YOU SAID</span>
                  "{transcript}"
                </div>
              </>
            )}
            {recState === 'error' && (
              <>
                <p style={{ fontWeight: 800, fontSize: 14, color: '#dc2626', marginBottom: 6 }}>Something went wrong</p>
                <p style={{ color: 'var(--gray)', fontSize: 13 }}>{errMsg}</p>
              </>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {recState === 'done' && (
              <button onClick={() => { setRecState('idle'); setTranscript('') }} className="black-button" style={{ flex: 1, justifyContent: 'center', minHeight: 46 }}>
                <Mic size={15} /> record another
              </button>
            )}
            {recState === 'error' && (
              <button onClick={() => setRecState('idle')} className="black-button" style={{ flex: 1, justifyContent: 'center', minHeight: 46 }}>
                try again
              </button>
            )}
            <button onClick={onClose} style={{ flex: 1, minHeight: 46, borderRadius: 12, border: '1.5px solid var(--border)', background: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--gray)' }}>
              {recState === 'done' ? 'done' : 'cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
