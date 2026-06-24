import { ChatPanel } from '../components/agent/ChatPanel'
import { IconStack } from '../components/brand/BrandMarks'

export function AgentPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 56px)' }}>
      <div className="top-status">
        <span className="availability">Onward agent loop online</span>
        <span><span className="mini-tag">plan</span> → <span className="mini-tag">act</span></span>
      </div>
      <section className="section-band soft-panel" style={{ paddingTop: 42, paddingBottom: 42, marginBottom: 26 }}>
        <div className="other-projects" style={{ minHeight: 250 }}>
          <h1 className="headline" style={{ fontSize: 'clamp(56px, 7vw, 112px)' }}>ask</h1>
          <IconStack />
          <h1 className="headline" style={{ fontSize: 'clamp(56px, 7vw, 112px)' }}>Onward</h1>
        </div>
      </section>
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 560 }}>
        <ChatPanel />
      </div>
    </div>
  )
}
