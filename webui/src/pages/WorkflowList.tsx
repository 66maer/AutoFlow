import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workflows as api } from '../api/client'
import { useI18n } from '../i18n'
import type { Workflow } from '../api/types'
import '../styles/workflow-list.css'

export default function WorkflowList() {
  const { t } = useI18n()
  const [list, setList] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      setList(await api.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    const wf = await api.create({ name: 'New Workflow' })
    navigate(`/workflows/${wf.id}`)
  }

  const handleDelete = async (id: string) => {
    await api.delete(id)
    setList((prev) => prev.filter((w) => w.id !== id))
  }

  const handleRun = async (id: string) => {
    await api.run(id)
    load()
  }

  const updateRepeat = async (wf: Workflow, updates: { repeat_count?: number; repeat_forever?: boolean }) => {
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
    <>
      <div className="page-header">
        <h1>{t('workflows.title')}</h1>
        <button className="primary" onClick={handleCreate}>
          {t('workflows.new')}
        </button>
      </div>
      <div className="page-body">
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : list.length === 0 ? (
          <p className="empty-hint">{t('workflows.empty')}</p>
        ) : (
          <div className="workflow-grid">
            {list.map((wf) => (
              <div key={wf.id} className="workflow-card" onClick={() => navigate(`/workflows/${wf.id}`)}>
                <div className="workflow-card-header">
                  <h3>{wf.name}</h3>
                  <span className={`badge ${wf.enabled ? 'enabled' : 'disabled'}`}>
                    {wf.enabled ? t('common.enabled') : t('common.disabled')}
                  </span>
                </div>
                <p className="workflow-desc">{wf.description || t('workflows.noDesc')}</p>
                <div className="workflow-meta">
                  <span>{wf.nodes.length} {t('workflows.nodes', { count: wf.nodes.length }).replace(/^\d+\s*/, '')}</span>
                  <span>{new Date(wf.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="workflow-repeat" onClick={(e) => e.stopPropagation()}>
                  <label className="repeat-checkbox-card">
                    <input
                      type="checkbox"
                      checked={wf.repeat_forever}
                      onChange={(e) => updateRepeat(wf, { repeat_forever: e.target.checked })}
                    />
                    {t('editor.repeatForever')}
                  </label>
                  {!wf.repeat_forever && (
                    <div className="repeat-count-card">
                      <span>{t('editor.repeatCount')}</span>
                      <input
                        type="number"
                        min={1}
                        value={wf.repeat_count || 1}
                        onChange={(e) => updateRepeat(wf, { repeat_count: Math.max(1, Number(e.target.value)) })}
                      />
                    </div>
                  )}
                </div>
                <div className="workflow-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="ghost" onClick={() => handleRun(wf.id)}>{t('common.run')}</button>
                  <button className="danger" onClick={() => handleDelete(wf.id)}>{t('common.delete')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
