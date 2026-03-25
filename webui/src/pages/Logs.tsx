import { useEffect, useRef, useState } from 'react'
import { logs as api, connectLogStream } from '../api/client'
import type { ExecutionLog } from '../api/types'
import '../styles/logs.css'

export default function Logs() {
  const [list, setList] = useState<ExecutionLog[]>([])
  const [selected, setSelected] = useState<ExecutionLog | null>(null)
  const [stream, setStream] = useState<unknown[]>([])
  const streamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.list().then(setList)
  }, [])

  useEffect(() => {
    const ws = connectLogStream((data) => {
      setStream((prev) => [...prev, data])
    })
    return () => ws.close()
  }, [])

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight
    }
  }, [stream])

  const handleSelect = async (id: string) => {
    const log = await api.get(id)
    setSelected(log)
  }

  return (
    <>
      <div className="page-header">
        <h1>Execution Logs</h1>
        <button className="ghost" onClick={() => { api.list().then(setList); setSelected(null) }}>
          Refresh
        </button>
      </div>
      <div className="page-body">
        <div className="logs-list">
          {list.map((log) => (
            <div key={log.id} className="log-item" onClick={() => handleSelect(log.id)}>
              <span className={`log-status ${log.status}`}>{log.status}</span>
              <div className="log-meta">
                <span>Workflow: {log.workflow_id.slice(0, 8)}...</span>
                <span>{new Date(log.started_at).toLocaleString()}</span>
                {log.finished_at && <span>Duration: {Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s</span>}
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="empty-hint">No logs yet.</p>}
        </div>

        {selected && (
          <div className="log-detail">
            <h3>Log Detail — {selected.status}</h3>
            <pre>{JSON.stringify(selected.detail, null, 2)}</pre>
          </div>
        )}

        <h3 style={{ marginTop: 24, marginBottom: 8 }}>Live Stream</h3>
        <div className="ws-log-stream" ref={streamRef}>
          {stream.length === 0 && <span style={{ opacity: 0.5 }}>Waiting for events...</span>}
          {stream.map((entry, i) => (
            <div key={i} className="ws-log-entry">{JSON.stringify(entry)}</div>
          ))}
        </div>
      </div>
    </>
  )
}
