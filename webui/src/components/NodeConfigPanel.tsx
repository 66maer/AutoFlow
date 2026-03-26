import { useCallback } from 'react'
import type { Node } from '@xyflow/react'
import { useI18n } from '../i18n'
import TemplatePicker from './TemplatePicker'
import KeyRecorder from './KeyRecorder'

interface Props {
  node: Node
  onChange: (id: string, data: Record<string, unknown>) => void
  onClose: () => void
  onDelete?: () => void
}

/** Combo step types */
interface ComboStep {
  action: 'key_down' | 'key_up' | 'click' | 'wait' | 'type_text'
  key?: string
  button?: string
  click_mode?: string
  ms?: number
  text?: string
}

const COMBO_ACTIONS = ['key_down', 'key_up', 'click', 'wait', 'type_text'] as const

export default function NodeConfigPanel({ node, onChange, onClose, onDelete }: Props) {
  const { t } = useI18n()
  const nodeType = (node.data.nodeType as string) || node.type || ''

  const update = (key: string, value: unknown) => {
    onChange(node.id, { ...node.data, [key]: value })
  }

  const label = t(`node.${nodeType}` as any) || nodeType

  // Combo step helpers
  const steps = ((node.data.steps as ComboStep[]) || []) as ComboStep[]

  const updateStep = useCallback(
    (index: number, patch: Partial<ComboStep>) => {
      const newSteps = steps.map((s, i) => (i === index ? { ...s, ...patch } : s))
      onChange(node.id, { ...node.data, steps: newSteps })
    },
    [node, steps, onChange],
  )

  const addStep = useCallback(
    (action: ComboStep['action'] = 'key_down') => {
      const newStep: ComboStep = { action }
      if (action === 'wait') newStep.ms = 100
      if (action === 'click') { newStep.click_mode = 'image'; newStep.button = 'left' }
      onChange(node.id, { ...node.data, steps: [...steps, newStep] })
    },
    [node, steps, onChange],
  )

  const removeStep = useCallback(
    (index: number) => {
      onChange(node.id, { ...node.data, steps: steps.filter((_, i) => i !== index) })
    },
    [node, steps, onChange],
  )

  const moveStep = useCallback(
    (index: number, dir: -1 | 1) => {
      const target = index + dir
      if (target < 0 || target >= steps.length) return
      const newSteps = [...steps]
      ;[newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]]
      onChange(node.id, { ...node.data, steps: newSteps })
    },
    [node, steps, onChange],
  )

  return (
    <div className="node-config-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>{label}</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {onDelete && (
            <button className="danger" onClick={onDelete} style={{ padding: '2px 8px', fontSize: 12 }}>
              {t('common.delete')}
            </button>
          )}
          <button className="ghost" onClick={onClose} style={{ padding: '2px 8px' }}>×</button>
        </div>
      </div>

      {/* ===== CLICK NODE ===== */}
      {nodeType === 'click' && (
        <>
          <div className="config-field">
            <label>{t('config.clickMode')}</label>
            <select
              value={String(node.data.click_mode || 'image')}
              onChange={(e) => update('click_mode', e.target.value)}
            >
              <option value="image">{t('config.clickMode.image')}</option>
              <option value="coord">{t('config.clickMode.coord')}</option>
              <option value="window">{t('config.clickMode.window')}</option>
            </select>
          </div>

          {(node.data.click_mode || 'image') === 'image' && (
            <>
              <div className="config-field">
                <label>{t('config.offsetType')}</label>
                <select
                  value={String(node.data.offset_type || 'px')}
                  onChange={(e) => update('offset_type', e.target.value)}
                >
                  <option value="px">{t('config.offsetType.px')}</option>
                  <option value="pct">{t('config.offsetType.pct')}</option>
                </select>
              </div>
              <div className="config-row">
                <div className="config-field">
                  <label>{t('config.offsetX')}</label>
                  <input type="number" value={String(node.data.offset_x ?? 0)} onChange={(e) => update('offset_x', Number(e.target.value))} />
                </div>
                <div className="config-field">
                  <label>{t('config.offsetY')}</label>
                  <input type="number" value={String(node.data.offset_y ?? 0)} onChange={(e) => update('offset_y', Number(e.target.value))} />
                </div>
              </div>
            </>
          )}

          {node.data.click_mode === 'coord' && (
            <div className="config-row">
              <div className="config-field">
                <label>{t('config.x')}</label>
                <input type="number" value={String(node.data.x ?? '')} onChange={(e) => update('x', e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div className="config-field">
                <label>{t('config.y')}</label>
                <input type="number" value={String(node.data.y ?? '')} onChange={(e) => update('y', e.target.value ? Number(e.target.value) : null)} />
              </div>
            </div>
          )}

          {node.data.click_mode === 'window' && (
            <>
              <div className="config-field">
                <label>{t('config.windowTitle')}</label>
                <input
                  value={String(node.data.window_title || '')}
                  onChange={(e) => update('window_title', e.target.value)}
                  placeholder={t('config.windowTitle.placeholder')}
                />
              </div>
              <div className="config-field">
                <label>{t('config.offsetType')}</label>
                <select
                  value={String(node.data.offset_type || 'px')}
                  onChange={(e) => update('offset_type', e.target.value)}
                >
                  <option value="px">{t('config.offsetType.px')}</option>
                  <option value="pct">{t('config.offsetType.pct')}</option>
                </select>
              </div>
              <div className="config-row">
                <div className="config-field">
                  <label>{t('config.offsetX')}</label>
                  <input type="number" value={String(node.data.offset_x ?? 0)} onChange={(e) => update('offset_x', Number(e.target.value))} />
                </div>
                <div className="config-field">
                  <label>{t('config.offsetY')}</label>
                  <input type="number" value={String(node.data.offset_y ?? 0)} onChange={(e) => update('offset_y', Number(e.target.value))} />
                </div>
              </div>
            </>
          )}

          <div className="config-field">
            <label>{t('config.button')}</label>
            <select value={String(node.data.button || 'left')} onChange={(e) => update('button', e.target.value)}>
              <option value="left">{t('config.button.left')}</option>
              <option value="right">{t('config.button.right')}</option>
              <option value="middle">{t('config.button.middle')}</option>
            </select>
          </div>
        </>
      )}

      {/* ===== KEY PRESS ===== */}
      {nodeType === 'key_press' && (
        <div className="config-field">
          <label>{t('config.key')}</label>
          <KeyRecorder
            value={String(node.data.keys || node.data.key || '')}
            onChange={(keys) => {
              // Store in 'keys' field (new format), clear legacy 'key'
              onChange(node.id, { ...node.data, keys, key: undefined })
            }}
          />
        </div>
      )}

      {/* ===== TYPE TEXT ===== */}
      {nodeType === 'type_text' && (
        <div className="config-field">
          <label>{t('config.text')}</label>
          <input value={String(node.data.text || '')} onChange={(e) => update('text', e.target.value)} />
        </div>
      )}

      {/* ===== WAIT ===== */}
      {nodeType === 'wait' && (
        <div className="config-field">
          <label>{t('config.waitMs')}</label>
          <input type="number" value={String(node.data.ms ?? 1000)} onChange={(e) => update('ms', Number(e.target.value))} />
        </div>
      )}

      {/* ===== FIND IMAGE ===== */}
      {nodeType === 'find_image' && (
        <>
          <TemplatePicker
            templateId={node.data.template_id as string | undefined}
            onChange={(id) => update('template_id', id)}
          />
          <div className="config-field">
            <label>{t('config.confidence')}</label>
            <input type="number" value={String(node.data.confidence ?? 0.8)} step="0.05" min="0" max="1" onChange={(e) => update('confidence', Number(e.target.value))} />
          </div>
          <div className="config-field">
            <label>{t('config.saveToVar')}</label>
            <input value={String(node.data.save_to || '')} onChange={(e) => update('save_to', e.target.value)} />
          </div>

          <div className="config-separator" />
          <label className="config-checkbox">
            <input
              type="checkbox"
              checked={!!node.data.timeout_enabled}
              onChange={(e) => update('timeout_enabled', e.target.checked)}
            />
            {t('config.timeoutEnabled')}
          </label>
          {node.data.timeout_enabled && (
            <>
              <div className="config-field">
                <label>{t('config.timeoutMs')}</label>
                <input type="number" value={String(node.data.timeout_ms ?? 5000)} min="100" step="100" onChange={(e) => update('timeout_ms', Number(e.target.value))} />
              </div>
              <div className="config-field">
                <label>{t('config.retryIntervalMs')}</label>
                <input type="number" value={String(node.data.retry_interval_ms ?? 500)} min="100" step="100" onChange={(e) => update('retry_interval_ms', Number(e.target.value))} />
              </div>
            </>
          )}
        </>
      )}

      {/* ===== COMBO ACTION ===== */}
      {nodeType === 'combo' && (
        <>
          <div className="combo-steps">
            {steps.map((step, i) => (
              <div key={i} className="combo-step">
                <div className="combo-step-header">
                  <select
                    value={step.action}
                    onChange={(e) => updateStep(i, { action: e.target.value as ComboStep['action'] })}
                  >
                    {COMBO_ACTIONS.map((a) => (
                      <option key={a} value={a}>{t(`config.combo.action.${a}` as any)}</option>
                    ))}
                  </select>
                  <div className="combo-step-actions">
                    <button type="button" className="ghost" onClick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
                    <button type="button" className="ghost" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>↓</button>
                    <button type="button" className="ghost danger" onClick={() => removeStep(i)}>×</button>
                  </div>
                </div>

                {/* Step-specific config */}
                {(step.action === 'key_down' || step.action === 'key_up') && (
                  <div className="combo-step-body">
                    <KeyRecorder
                      value={step.key || ''}
                      onChange={(k) => updateStep(i, { key: k })}
                    />
                  </div>
                )}
                {step.action === 'click' && (
                  <div className="combo-step-body">
                    <select
                      value={step.click_mode || 'image'}
                      onChange={(e) => updateStep(i, { click_mode: e.target.value })}
                    >
                      <option value="image">{t('config.clickMode.image')}</option>
                      <option value="coord">{t('config.clickMode.coord')}</option>
                    </select>
                    <select
                      value={step.button || 'left'}
                      onChange={(e) => updateStep(i, { button: e.target.value })}
                    >
                      <option value="left">{t('config.button.left')}</option>
                      <option value="right">{t('config.button.right')}</option>
                      <option value="middle">{t('config.button.middle')}</option>
                    </select>
                  </div>
                )}
                {step.action === 'wait' && (
                  <div className="combo-step-body">
                    <input
                      type="number"
                      value={String(step.ms ?? 100)}
                      min="0"
                      step="50"
                      onChange={(e) => updateStep(i, { ms: Number(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                    <span className="combo-step-unit">ms</span>
                  </div>
                )}
                {step.action === 'type_text' && (
                  <div className="combo-step-body">
                    <input
                      value={step.text || ''}
                      onChange={(e) => updateStep(i, { text: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="ghost combo-add-btn"
            onClick={() => addStep('key_down')}
          >
            {t('config.combo.addStep')}
          </button>
        </>
      )}

      {/* ===== LOOP ===== */}
      {nodeType === 'loop' && (
        <>
          <div className="config-field">
            <label>{t('config.loopMode')}</label>
            <select
              value={String(node.data.loop_mode || 'count')}
              onChange={(e) => update('loop_mode', e.target.value)}
            >
              <option value="count">{t('config.loopMode.count')}</option>
              <option value="infinite">{t('config.loopMode.infinite')}</option>
            </select>
          </div>
          {(node.data.loop_mode || 'count') === 'count' && (
            <div className="config-field">
              <label>{t('config.loopCount')}</label>
              <input type="number" value={String(node.data.max_iterations ?? 10)} min="1" onChange={(e) => update('max_iterations', Number(e.target.value))} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
