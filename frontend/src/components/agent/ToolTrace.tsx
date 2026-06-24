import { useAgentStore } from '../../stores/agentStore'

export function ToolTrace() {
  const toolTrace = useAgentStore((state) => state.toolTrace)

  if (toolTrace.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-code-bg p-3 text-xs text-text">
      <p className="mb-1 font-medium text-text-h">Agent activity</p>
      <ul className="flex flex-col gap-1">
        {toolTrace.map((line, index) => (
          <li key={`${line}-${index}`}>• {line}</li>
        ))}
      </ul>
    </div>
  )
}
