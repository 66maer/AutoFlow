import { useEffect, useRef, useState } from 'react'
import { logs as api, connectLogStream } from '../api/client'
import { useI18n } from '../i18n'
import type { ExecutionLog } from '../api/types'
import '../styles/logs.css'

/* ── node type → icon mapping ── */
const NODE_ICONS: Record<string, string> = {
  capture: '📷',
  find_image: '🔍',
  click: '🖱️',
  key_press: '⌨️',
  type_text: '✏️',
  wait: '⏳',
  condition: '❓',
  branch: '🔀',
  loop: '🔄',
  combo: '⚡',
}

interface StepLog {
  node_id: string
  type: string
  label?: string
  status: 'running' | 'success' | 'failed'
  started_at?: number
  elapsed_ms?: number
  result?: Record<string, unknown>
  error?: string
}

interface StreamEvent {
  type: 'step' | 'workflow'
  workflow_id: string
  node_id?: string
  status: string
  detail?: Record<string, unknown>
  error?: string
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return `${m}m ${s}s`
}

function StepResultSummary({ step }: { step: StepLog }) {
  const r = step.result
  if (!r) return null

  switch (step.type) {
    case 'capture':
      return <span className="step-result-text">截图完成</span>
    case 'find_image':
      if (r.confidence !== undefined) {
        return (
          <span className="step-result-text step-result-found">
            匹配成功 (置信度 {Math.round(Number(r.confidence) * 100)}%)
          </span>
        )
      }
      return <span className="step-result-text step-result-miss">未找到匹配</span>
    case 'click':
      return <span className="step-result-text">点击 ({String(r.x)}, {String(r.y)})</span>
    case 'key_press':
      return <span className="step-result-text">按键: {String(r.keys)}</span>
    case 'type_text':
      return <span className="step-result-text">已输入文本</span>
    case 'wait':
      return <span className="step-result-text">等待了 {String(r.waited_ms)}ms</span>
    case 'condition':
    case 'branch':
      return (
        <span className="step-result-text">
          条件结果: {r.found ? '✓ 真' : '✗ 假'}
        </span>
      )
    case 'loop':
      return <span className="step-result-text">循环 {String(r.iterations)} 次</span>
    case 'combo':
      return <span className="step-result-text">执行了 {String(r.steps_executed)} 个步骤</span>
    default:
      return null
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <span className="step-status-icon running" title="运行中">●</span>
    case 'success':
      return <span className="step-status-icon success" title="成功">✓</span>
    case 'failed':
      return <span className="step-status-icon failed" title="失败">✗</span>
    default:
      return <span className="step-status-icon">○</span>
  }
}

/* ── Node type display name ── */
const NODE_NAMES: Record<string, string> = {
  capture: '截图',
  find_image: '找图',
  click: '点击',
  key_press: '按键',
  type_text: '输入文本',
  wait: '等待',
  condition: '条件判断',
  branch: '条件分支',
  loop: '循环',
  combo: '组合动作',
}

/* ── Log Detail Panel ── */
function LogDetail({ log, onBack }: { log: ExecutionLog; onBack: () => void }) {
  const detail = log.detail as { logs?: StepLog[]; error?: string }
  const steps: StepLog[] = detail?.logs ?? []
  const totalMs = log.finished_at
    ? new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()
    : 0
  const failedStep = steps.find((s) => s.status === 'failed')

  return (
    <div className="log-detail-panel">
      <button className="ghost log-back-btn" onClick={onBack}>
        ← 返回列表
      </button>

      {/* Summary bar */}
      <div className="log-summary-bar">
        <div className={`log-summary-status ${log.status}`}>
          <StatusIcon status={log.status} />
          <span>{log.status === 'success' ? '执行成功' : log.status === 'failed' ? '执行失败' : '执行中'}</span>
        </div>
        <div className="log-summary-meta">
          <span className="log-summary-item">
            <span className="log-summary-label">开始时间</span>
            <span>{formatTime(log.started_at)}</span>
          </span>
          {totalMs > 0 && (
            <span className="log-summary-item">
              <span className="log-summary-label">总耗时</span>
              <span>{formatDuration(totalMs)}</span>
            </span>
          )}
          <span className="log-summary-item">
            <span className="log-summary-label">总步骤</span>
            <span>{steps.length}</span>
          </span>
        </div>
      </div>

      {/* Error banner */}
      {log.status === 'failed' && detail?.error && (
        <div className="log-error-banner">
          <span className="log-error-icon">✗</span>
          <div className="log-error-content">
            <strong>失败于</strong>
            {failedStep && (
              <span className="log-error-node">
                {NODE_ICONS[failedStep.type] || '●'} {NODE_NAMES[failedStep.type] || failedStep.type}
                {failedStep.label ? ` — ${failedStep.label}` : ''}
              </span>
            )}
            <code className="log-error-message">{failedStep?.error || detail.error}</code>
          </div>
        </div>
      )}

      {/* Steps timeline */}
      <div className="steps-timeline">
        {steps.length === 0 && <p className="empty-hint">没有执行步骤记录</p>}
        {steps.map((step, i) => (
          <div key={i} className={`step-item ${step.status}`}>
            <div className="step-line-col">
              <StatusIcon status={step.status} />
              {i < steps.length - 1 && <div className="step-connector" />}
            </div>
            <div className="step-content">
              <div className="step-header">
                <span className="step-index">#{i + 1}</span>
                <span className="step-icon">{NODE_ICONS[step.type] || '●'}</span>
                <span className="step-type">{NODE_NAMES[step.type] || step.type}</span>
                {step.label && <span className="step-label">{step.label}</span>}
                {step.elapsed_ms !== undefined && (
                  <span className="step-elapsed">{formatDuration(step.elapsed_ms)}</span>
                )}
              </div>
              {step.status === 'success' && step.result && (
                <div className="step-result">
                  <StepResultSummary step={step} />
                </div>
              )}
              {step.status === 'failed' && step.error && (
                <div className="step-error">
                  <code>{step.error}</code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Live stream panel ── */
function LiveStream({ events }: { events: StreamEvent[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [events])

  if (events.length === 0) {
    return (
      <div className="live-stream-empty">
        <div className="live-stream-pulse" />
        <span>等待执行...</span>
      </div>
    )
  }

  return (
    <div className="live-stream" ref={ref}>
      {events.map((evt, i) => {
        if (evt.type === 'workflow') {
          return (
            <div key={i} className={`live-event live-workflow ${evt.status}`}>
              <span className="live-time">{new Date().toLocaleTimeString()}</span>
              <StatusIcon status={evt.status} />
              <span>
                工作流 {evt.workflow_id.slice(0, 8)}...
                {evt.status === 'running' && ' 开始执行'}
                {evt.status === 'success' && ' 执行完成'}
                {evt.status === 'failed' && ' 执行失败'}
              </span>
              {evt.error && <code className="live-error">{evt.error}</code>}
            </div>
          )
        }

        const d = evt.detail || {}
        const nodeType = (d.node_type as string) || ''
        const label = (d.label as string) || ''
        const elapsed = d.elapsed_ms as number | undefined

        return (
          <div key={i} className={`live-event live-step ${evt.status}`}>
            <span className="live-time">{new Date().toLocaleTimeString()}</span>
            <StatusIcon status={evt.status} />
            <span className="live-node-icon">{NODE_ICONS[nodeType] || '●'}</span>
            <span className="live-node-type">{NODE_NAMES[nodeType] || nodeType}</span>
            {label && <span className="live-node-label">{label}</span>}
            {elapsed !== undefined && (
              <span className="live-elapsed">{formatDuration(elapsed)}</span>
            )}
            {evt.status === 'failed' && d.error && (
              <code className="live-error">{String(d.error)}</code>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Main Logs Page ── */
export default function Logs() {
  const { t } = useI18n()
  const [list, setList] = useState<ExecutionLog[]>([])
  const [selected, setSelected] = useState<ExecutionLog | null>(null)
  const [stream, setStream] = useState<StreamEvent[]>([])

  useEffect(() => {
    api.list().then(setList)
  }, [])

  useEffect(() => {
    const ws = connectLogStream((data) => {
      setStream((prev) => [...prev, data as StreamEvent])
      // Auto-refresh list when a workflow completes
      const evt = data as StreamEvent
      if (evt.type === 'workflow' && (evt.status === 'success' || evt.status === 'failed')) {
        setTimeout(() => api.list().then(setList), 500)
      }
    })
    return () => ws.close()
  }, [])

  const handleSelect = async (id: string) => {
    const log = await api.get(id)
    setSelected(log)
  }

  if (selected) {
    return (
      <div className="logs-panel">
        <LogDetail log={selected} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="logs-panel">
      {/* Live execution */}
      <div className="logs-section">
        <div className="logs-section-header">
          <h3>{t('logs.liveStream')}</h3>
          <div className="live-dot" />
        </div>
        <LiveStream events={stream} />
      </div>

      {/* History */}
      <div className="logs-section">
        <div className="logs-section-header">
          <h3>{t('logs.title')}</h3>
          <button
            className="ghost"
            onClick={() => {
              api.list().then(setList)
            }}
          >
            {t('common.refresh')}
          </button>
        </div>

        <div className="logs-list">
          {list.map((log) => {
            const totalMs = log.finished_at
              ? new Date(log.finished_at).getTime() - new Date(log.started_at).getTime()
              : 0
            const detail = log.detail as { logs?: StepLog[]; error?: string }
            const stepCount = detail?.logs?.length ?? 0

            return (
              <div key={log.id} className="log-item" onClick={() => handleSelect(log.id)}>
                <div className={`log-status-badge ${log.status}`}>
                  <StatusIcon status={log.status} />
                  <span>{t(`logs.status.${log.status}` as any)}</span>
                </div>
                <div className="log-info">
                  <span className="log-info-workflow">
                    {t('logs.workflow', { id: log.workflow_id.slice(0, 8) + '...' })}
                  </span>
                  <span className="log-info-time">{formatTime(log.started_at)}</span>
                </div>
                <div className="log-stats">
                  {stepCount > 0 && <span className="log-stat">{stepCount} 步</span>}
                  {totalMs > 0 && <span className="log-stat">{formatDuration(totalMs)}</span>}
                </div>
                {log.status === 'failed' && detail?.error && (
                  <div className="log-item-error" title={detail.error}>
                    {detail.error.length > 60 ? detail.error.slice(0, 60) + '...' : detail.error}
                  </div>
                )}
                <span className="log-arrow">›</span>
              </div>
            )
          })}
          {list.length === 0 && <p className="empty-hint">{t('logs.empty')}</p>}
        </div>
      </div>
    </div>
  )
}
