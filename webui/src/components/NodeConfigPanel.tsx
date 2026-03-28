import { useCallback, useMemo, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { useI18n } from '../i18n'
import TemplatePicker from './TemplatePicker'
import KeyRecorder from './KeyRecorder'
import { getUpstreamVariables, OPERATORS_FOR_TYPE, type VarField } from '../utils/variables'
import { screen as screenApi } from '../api/client'

interface Props {
  node: Node
  nodes: Node[]
  edges: Edge[]
  onChange: (id: string, data: Record<string, unknown>) => void
  onClose: () => void
  onDelete?: () => void
  /** When true, renders without the outer wrapper div (used for snap-merged panels) */
  embedded?: boolean
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

export default function NodeConfigPanel({ node, nodes, edges, onChange, onClose, onDelete, embedded }: Props) {
  const { t } = useI18n()
  const nodeType = (node.data.nodeType as string) || node.type || ''

  const update = (key: string, value: unknown) => {
    onChange(node.id, { ...node.data, [key]: value })
  }

  const updateMultiple = (patches: Record<string, unknown>) => {
    onChange(node.id, { ...node.data, ...patches })
  }

  const label = t(`node.${nodeType}` as any) || nodeType

  // Available upstream variables for this node
  const upstreamVars = useMemo(
    () => getUpstreamVariables(node.id, nodes, edges),
    [node.id, nodes, edges],
  )

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

  // Get operators for the currently selected variable in branch/loop
  const getOpsForVar = (varPath: string): { value: string; label: string }[] => {
    const v = upstreamVars.find((f) => f.path === varPath)
    const vType = v?.type || 'boolean'
    return OPERATORS_FOR_TYPE[vType] || OPERATORS_FOR_TYPE['boolean']
  }

  const content = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>{label}</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {onDelete && !embedded && (
            <button className="danger" onClick={onDelete} style={{ padding: '2px 8px', fontSize: 12 }}>
              {t('common.delete')}
            </button>
          )}
          {!embedded && <button className="ghost" onClick={onClose} style={{ padding: '2px 8px' }}>×</button>}
        </div>
      </div>

      {/* ===== MOUSE ACTION NODE (also handles legacy 'click') ===== */}
      {(nodeType === 'mouse_action' || nodeType === 'click') && (
        <MouseActionConfig
          node={node}
          update={update}
          updateMultiple={updateMultiple}
          upstreamVars={upstreamVars}
          t={t}
        />
      )}

      {/* ===== KEY PRESS ===== */}
      {nodeType === 'key_press' && (
        <div className="config-field">
          <label>{t('config.key')}</label>
          <KeyRecorder
            value={String(node.data.keys || node.data.key || '')}
            onChange={(keys) => {
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
            <input value={String(node.data.save_to || '')} onChange={(e) => update('save_to', e.target.value)} placeholder="match1" />
          </div>

          <div className="config-field">
            <label>{t('config.findImageInterval')}</label>
            <input type="number" value={String(node.data.interval_ms ?? 0)} min="0" step="100" onChange={(e) => update('interval_ms', Number(e.target.value))} />
          </div>
        </>
      )}

      {/* ===== CAPTURE (screenshot) ===== */}
      {nodeType === 'capture' && (
        <>
          <div className="config-field">
            <label>{t('config.captureMode')}</label>
            <select
              value={String(node.data.capture_mode || 'fullscreen')}
              onChange={(e) => update('capture_mode', e.target.value)}
            >
              <option value="fullscreen">{t('config.captureMode.fullscreen')}</option>
              <option value="region">{t('config.captureMode.region')}</option>
            </select>
          </div>
          {node.data.capture_mode === 'region' && (
            <>
              <div className="config-row">
                <div className="config-field">
                  <label>{t('config.x')}</label>
                  <input type="number" value={String(node.data.region_x ?? 0)} min="0" onChange={(e) => update('region_x', Number(e.target.value))} />
                </div>
                <div className="config-field">
                  <label>{t('config.y')}</label>
                  <input type="number" value={String(node.data.region_y ?? 0)} min="0" onChange={(e) => update('region_y', Number(e.target.value))} />
                </div>
              </div>
              <div className="config-row">
                <div className="config-field">
                  <label>{t('config.width')}</label>
                  <input type="number" value={String(node.data.region_w ?? 100)} min="1" onChange={(e) => update('region_w', Number(e.target.value))} />
                </div>
                <div className="config-field">
                  <label>{t('config.height')}</label>
                  <input type="number" value={String(node.data.region_h ?? 100)} min="1" onChange={(e) => update('region_h', Number(e.target.value))} />
                </div>
              </div>
            </>
          )}
          <div className="config-field">
            <label>{t('config.saveToVar')}</label>
            <input value={String(node.data.save_to || '')} onChange={(e) => update('save_to', e.target.value)} placeholder="screen1" />
          </div>
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

      {/* ===== BRANCH / CONDITION — expression builder ===== */}
      {(nodeType === 'branch' || nodeType === 'condition') && (
        <>
          {upstreamVars.length > 0 ? (
            <ConditionExprBuilder
              varPath={String(node.data.cond_var || '')}
              operator={String(node.data.cond_op || '==')}
              value={String(node.data.cond_value ?? '')}
              vars={upstreamVars}
              onVarChange={(v) => {
                // When variable changes, reset operator to first valid one
                const ops = OPERATORS_FOR_TYPE[upstreamVars.find(f => f.path === v)?.type || 'boolean'] || OPERATORS_FOR_TYPE['boolean']
                onChange(node.id, { ...node.data, cond_var: v, cond_op: ops[0]?.value || '==', cond_value: '' })
              }}
              onOpChange={(op) => update('cond_op', op)}
              onValueChange={(val) => update('cond_value', val)}
              getOpsForVar={getOpsForVar}
            />
          ) : (
            <div className="config-hint">{t('config.branch.noVars')}</div>
          )}
          <div className="config-hint" style={{ whiteSpace: 'pre-line' }}>
            {t('config.branchHint')}
          </div>
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
              <option value="condition">{t('config.loopMode.condition')}</option>
            </select>
          </div>
          {(node.data.loop_mode || 'count') === 'count' && (
            <div className="config-field">
              <label>{t('config.loopCount')}</label>
              <input type="number" value={String(node.data.max_iterations ?? 10)} min="1" onChange={(e) => update('max_iterations', Number(e.target.value))} />
            </div>
          )}
          {node.data.loop_mode === 'condition' && (
            <>
              {upstreamVars.length > 0 ? (
                <ConditionExprBuilder
                  varPath={String(node.data.cond_var || '')}
                  operator={String(node.data.cond_op || '==')}
                  value={String(node.data.cond_value ?? '')}
                  vars={upstreamVars}
                  onVarChange={(v) => {
                    const ops = OPERATORS_FOR_TYPE[upstreamVars.find(f => f.path === v)?.type || 'boolean'] || OPERATORS_FOR_TYPE['boolean']
                    onChange(node.id, { ...node.data, cond_var: v, cond_op: ops[0]?.value || '==', cond_value: '' })
                  }}
                  onOpChange={(op) => update('cond_op', op)}
                  onValueChange={(val) => update('cond_value', val)}
                  getOpsForVar={getOpsForVar}
                />
              ) : (
                <div className="config-hint">{t('config.branch.noVars')}</div>
              )}
              <div className="config-field">
                <label>{t('config.loopMaxSafety')}</label>
                <input type="number" value={String(node.data.max_iterations ?? 1000)} min="1" onChange={(e) => update('max_iterations', Number(e.target.value))} />
              </div>
            </>
          )}
          <div className="config-hint" style={{ whiteSpace: 'pre-line' }}>
            {t('config.loopHint')}
          </div>
        </>
      )}
    </>
  )

  if (embedded) return content
  return <div className="node-config-panel">{content}</div>
}

/** Mouse action config: position + button + action + scroll amount */
function MouseActionConfig({
  node, update, updateMultiple, upstreamVars, t,
}: {
  node: Node
  update: (key: string, value: unknown) => void
  updateMultiple: (patches: Record<string, unknown>) => void
  upstreamVars: VarField[]
  t: (key: any, params?: Record<string, string>) => string
}) {
  const button = String(node.data.button || 'left')
  const action = String(node.data.action || 'click')
  const [picking, setPicking] = useState(false)
  const isMiddle = button === 'middle'

  // Available actions depend on button
  const getActions = () => {
    if (isMiddle) return ['click', 'double_click', 'scroll_up', 'scroll_down']
    return ['click', 'double_click']
  }
  const actions = getActions()

  // When button changes to non-middle, reset scroll actions
  const handleButtonChange = (btn: string) => {
    if (btn !== 'middle' && (action === 'scroll_up' || action === 'scroll_down')) {
      updateMultiple({ button: btn, action: 'click' })
    } else {
      update('button', btn)
    }
  }

  const isScroll = action === 'scroll_up' || action === 'scroll_down'

  // Find upstream find_image variables for source_var dropdown
  const matchVars = upstreamVars
    .filter((v) => v.suffix === 'x' && v.sourceNodeType === 'find_image')
    .map((v) => v.path.replace(/\.x$/, ''))
  const uniqueMatchVars = [...new Set(matchVars)]

  return (
    <>
      {/* Row 1: Button + Action */}
      <div className="config-row">
        <div className="config-field">
          <label>{t('config.button')}</label>
          <select value={button} onChange={(e) => handleButtonChange(e.target.value)}>
            <option value="left">{t('config.button.left')}</option>
            <option value="right">{t('config.button.right')}</option>
            <option value="middle">{t('config.button.middle')}</option>
            <option value="side1">{t('config.button.side1')}</option>
            <option value="side2">{t('config.button.side2')}</option>
          </select>
        </div>
        <div className="config-field">
          <label>{t('config.mouseAction')}</label>
          <select value={action} onChange={(e) => update('action', e.target.value)}>
            {actions.map((a) => (
              <option key={a} value={a}>{t(`config.mouseAction.${a}` as any)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scroll amount (only when scroll action selected) */}
      {isScroll && (
        <div className="config-field">
          <label>{t('config.scrollAmount')}</label>
          <input type="number" value={String(node.data.scroll_amount ?? 3)} min="1" onChange={(e) => update('scroll_amount', Number(e.target.value))} />
        </div>
      )}

      <div className="config-separator" />

      {/* Position mode */}
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

      {/* Image mode: source variable + offset */}
      {(node.data.click_mode || 'image') === 'image' && (
        <>
          {uniqueMatchVars.length > 0 && (
            <div className="config-field">
              <label>{t('config.sourceVar')}</label>
              <select
                value={String(node.data.source_var || '')}
                onChange={(e) => update('source_var', e.target.value)}
              >
                <option value="">{t('config.sourceVar.lastMatch')}</option>
                {uniqueMatchVars.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}
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

      {/* Coord mode */}
      {node.data.click_mode === 'coord' && (
        <>
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
          <button
            type="button"
            className="ghost"
            style={{ width: '100%', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            disabled={picking}
            onClick={async () => {
              setPicking(true)
              try {
                const res = await screenApi.pickCoord('free')
                if (!res.cancelled && res.x != null && res.y != null) {
                  updateMultiple({ x: res.x, y: res.y })
                }
              } finally {
                setPicking(false)
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>
            {picking ? t('config.picking' as any) : t('config.pickCoord' as any)}
          </button>
        </>
      )}

      {/* Window mode */}
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
          <button
            type="button"
            className="ghost"
            style={{ width: '100%', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            disabled={picking}
            onClick={async () => {
              setPicking(true)
              try {
                const res = await screenApi.pickCoord('window')
                if (!res.cancelled && res.x != null && res.y != null) {
                  updateMultiple({
                    ...(res.window_title ? { window_title: res.window_title } : {}),
                    offset_x: res.x,
                    offset_y: res.y,
                  })
                }
              } finally {
                setPicking(false)
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="3" x2="12" y2="9" /><line x1="12" y1="15" x2="12" y2="21" /><line x1="3" y1="12" x2="9" y2="12" /><line x1="15" y1="12" x2="21" y2="12" /></svg>
            {picking ? t('config.picking' as any) : t('config.pickWindow' as any)}
          </button>
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
    </>
  )
}

/** Reusable condition expression builder: [variable ▼] [op ▼] [value] */
function ConditionExprBuilder({
  varPath, operator, value, vars,
  onVarChange, onOpChange, onValueChange, getOpsForVar,
}: {
  varPath: string
  operator: string
  value: string
  vars: VarField[]
  onVarChange: (v: string) => void
  onOpChange: (op: string) => void
  onValueChange: (val: string) => void
  getOpsForVar: (varPath: string) => { value: string; label: string }[]
}) {
  const { t } = useI18n()
  const selectedVar = vars.find((v) => v.path === varPath)
  const ops = getOpsForVar(varPath)
  const varType = selectedVar?.type || 'boolean'
  const isUnary = operator === 'exists' || operator === '!exists'

  return (
    <div className="condition-expr">
      {/* Variable selector */}
      <div className="config-field">
        <label>{t('config.branch.variable')}</label>
        <select value={varPath} onChange={(e) => onVarChange(e.target.value)}>
          <option value="">{t('config.branch.selectVar')}</option>
          {vars.map((v) => (
            <option key={v.path} value={v.path}>
              {v.path} ({t(`config.varType.${v.type}` as any)})
            </option>
          ))}
        </select>
      </div>

      {/* Operator */}
      {varPath && (
        <div className="config-field">
          <label>{t('config.branch.operator')}</label>
          <select value={operator} onChange={(e) => onOpChange(e.target.value)}>
            {ops.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Value (type-aware) */}
      {varPath && !isUnary && (
        <div className="config-field">
          <label>{t('config.branch.value')}</label>
          {varType === 'boolean' ? (
            <select value={value} onChange={(e) => onValueChange(e.target.value)}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : varType === 'number' ? (
            <input type="number" value={value} onChange={(e) => onValueChange(e.target.value)} />
          ) : (
            <input value={value} onChange={(e) => onValueChange(e.target.value)} />
          )}
        </div>
      )}
    </div>
  )
}
