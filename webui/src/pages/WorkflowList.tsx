import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { workflows as api } from '../api/client'
import { useI18n } from '../i18n'
import KeyRecorder from '../components/KeyRecorder'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Workflow } from '../api/types'
import '../styles/workflow-list.css'

export default function WorkflowList() {
  const { t } = useI18n()
  const [list, setList] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())
  const [stopKey, setStopKey] = useState(() => localStorage.getItem('autoflow_stop_key') || 'f9')
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await api.list())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Persist stop key
  useEffect(() => {
    localStorage.setItem('autoflow_stop_key', stopKey)
  }, [stopKey])

  const handleCreate = async () => {
    const wf = await api.create({ name: 'New Workflow' })
    navigate(`/workflows/${wf.id}`)
  }

  const handleDeleteClick = (e: React.MouseEvent, wf: Workflow) => {
    e.stopPropagation()
    setDeleteTarget(wf)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await api.delete(deleteTarget.id)
    setList((prev) => prev.filter((w) => w.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const handleRun = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setRunningIds((prev) => new Set(prev).add(id))
    try {
      await api.run(id)
    } finally {
      // After the run API returns, the workflow has finished
      setRunningIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleStop = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await api.stop(id)
    setRunningIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const updateRepeat = async (e: React.MouseEvent | React.ChangeEvent, wf: Workflow, updates: { repeat_count?: number; repeat_forever?: boolean }) => {
    if ('stopPropagation' in e) e.stopPropagation()
    const newForever = updates.repeat_forever ?? wf.repeat_forever
    const newCount = updates.repeat_count ?? wf.repeat_count
    await api.update(wf.id, {
      repeat_count: newForever ? 0 : newCount,
      repeat_forever: newForever,
    } as any)
    setList((prev) =>
      prev.map((w) =>
        w.id === wf.id
          ? { ...w, repeat_forever: newForever, repeat_count: newForever ? 0 : newCount }
          : w,
      ),
    )
  }

  return (
    <div className="wf-page">
      {/* Top bar */}
      <div className="wf-topbar">
        <div className="wf-topbar-left">
          <span className="wf-logo">AutoFlow</span>
          <button className="primary wf-new-btn" onClick={handleCreate}>
            + {t('workflows.new').replace('+ ', '')}
          </button>
        </div>
        <div className="wf-topbar-right">
          <span className="wf-stop-label">{t('workflows.globalStopKey')}</span>
          <div className="wf-stop-key" onClick={(e) => e.stopPropagation()}>
            <KeyRecorder value={stopKey} onChange={setStopKey} />
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="wf-body">
        {loading ? (
          <p className="wf-empty">{t('common.loading')}</p>
        ) : list.length === 0 ? (
          <p className="wf-empty">{t('workflows.empty')}</p>
        ) : (
          <div className="wf-grid">
            {list.map((wf) => {
              const isRunning = runningIds.has(wf.id)
              return (
                <div
                  key={wf.id}
                  className={`wf-card ${isRunning ? 'wf-card--running' : ''}`}
                  onClick={() => navigate(`/workflows/${wf.id}`)}
                >
                  {/* Delete button — top left, hidden until hover */}
                  <button
                    className="wf-card-delete"
                    onClick={(e) => handleDeleteClick(e, wf)}
                    title={t('common.delete')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>

                  {/* Card header */}
                  <div className="wf-card-header">
                    <h3 className="wf-card-name">{wf.name}</h3>
                    <p className="wf-card-desc">{wf.description || t('workflows.noDesc')}</p>
                  </div>

                  {/* Repeat controls — center */}
                  <div className="wf-card-repeat" onClick={(e) => e.stopPropagation()}>
                    <span className="wf-repeat-label">{t('workflows.runTimes')}</span>
                    <input
                      type="number"
                      className="wf-repeat-input"
                      min={1}
                      value={wf.repeat_count || 1}
                      disabled={wf.repeat_forever}
                      onChange={(e) => updateRepeat(e, wf, { repeat_count: Math.max(1, Number(e.target.value)) })}
                    />
                    <span className="wf-repeat-label">{t('workflows.runTimesUnit')}</span>
                    <label className="wf-infinite-check">
                      <input
                        type="checkbox"
                        checked={wf.repeat_forever}
                        onChange={(e) => updateRepeat(e, wf, { repeat_forever: e.target.checked })}
                      />
                      {t('workflows.infinite')}
                    </label>
                  </div>

                  {/* Footer — run/stop + status */}
                  <div className="wf-card-footer">
                    <span className="wf-card-meta">
                      {wf.nodes.length} {t('workflows.nodes', { count: String(wf.nodes.length) }).replace(/^\d+\s*/, '')}
                    </span>
                    <div className="wf-card-actions">
                      {isRunning && (
                        <span className="wf-running-badge">{t('workflows.running')}</span>
                      )}
                      {isRunning ? (
                        <button
                          className="wf-stop-btn"
                          onClick={(e) => handleStop(e, wf.id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12" rx="1" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          className="wf-play-btn"
                          onClick={(e) => handleRun(e, wf.id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          message={t('workflows.confirmDelete', { name: deleteTarget.name })}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
