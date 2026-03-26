import { useEffect, useRef, useState } from 'react'
import { logs as api, connectLogStream } from '../api/client'
import { useI18n } from '../i18n'
import type { ExecutionLog } from '../api/types'
import '../styles/logs.css'

export default function Logs() {
  const { t } = useI18n()
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
    <div className="logs-panel">
      <div className="logs-toolbar">
        <button className="ghost" onClick={() => { api.list().then(setList); setSelected(null) }}>
          {t('common.refresh')}
        </button>
      </div>

      <div className="logs-list">
        {list.map((log) => (
          <div key={log.id} className="log-item" onClick={() => handleSelect(log.id)}>
            <span className={`log-status ${log.status}`}>
              {t(`logs.status.${log.status}` as any)}
            </span>
            <div className="log-meta">
              <span>{t('logs.workflow', { id: log.workflow_id.slice(0, 8) + '...' })}</span>
              <span>{new Date(log.started_at).toLocaleString()}</span>
              {log.finished_at && (
                <span>{t('logs.duration', { seconds: String(Math.round((new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()) / 1000)) })}</span>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="empty-hint">{t('logs.empty')}</p>}
      </div>

      {selected && (
        <div className="log-detail">
          <h3>{t('logs.detail', { status: selected.status })}</h3>
          <pre>{JSON.stringify(selected.detail, null, 2)}</pre>
        </div>
      )}

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>{t('logs.liveStream')}</h3>
      <div className="ws-log-stream" ref={streamRef}>
        {stream.length === 0 && <span style={{ opacity: 0.5 }}>{t('logs.waiting')}</span>}
        {stream.map((entry, i) => (
          <div key={i} className="ws-log-entry">{JSON.stringify(entry)}</div>
        ))}
      </div>
    </div>
  )
}
