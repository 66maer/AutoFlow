import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workflows as api } from '../api/client'
import type { Workflow } from '../api/types'
import '../styles/workflow-list.css'

export default function WorkflowList() {
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

  return (
    <>
      <div className="page-header">
        <h1>Workflows</h1>
        <button className="primary" onClick={handleCreate}>
          + New Workflow
        </button>
      </div>
      <div className="page-body">
        {loading ? (
          <p>Loading...</p>
        ) : list.length === 0 ? (
          <p className="empty-hint">No workflows yet. Create one to get started.</p>
        ) : (
          <div className="workflow-grid">
            {list.map((wf) => (
              <div key={wf.id} className="workflow-card" onClick={() => navigate(`/workflows/${wf.id}`)}>
                <div className="workflow-card-header">
                  <h3>{wf.name}</h3>
                  <span className={`badge ${wf.enabled ? 'enabled' : 'disabled'}`}>
                    {wf.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="workflow-desc">{wf.description || 'No description'}</p>
                <div className="workflow-meta">
                  <span>{wf.nodes.length} nodes</span>
                  <span>{new Date(wf.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="workflow-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="ghost" onClick={() => handleRun(wf.id)}>Run</button>
                  <button className="danger" onClick={() => handleDelete(wf.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
