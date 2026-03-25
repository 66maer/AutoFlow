import type { Node } from '@xyflow/react'
import { useI18n } from '../i18n'
import TemplatePicker from './TemplatePicker'

interface Props {
  node: Node
  onChange: (id: string, data: Record<string, unknown>) => void
  onClose: () => void
  onDelete?: () => void
}

export default function NodeConfigPanel({ node, onChange, onClose, onDelete }: Props) {
  const { t } = useI18n()
  const nodeType = (node.data.nodeType as string) || node.type || ''

  const update = (key: string, value: unknown) => {
    onChange(node.id, { ...node.data, [key]: value })
  }

  const label = t(`node.${nodeType}` as any) || nodeType

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

          {/* Image mode: offset from found image center */}
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

          {/* Coordinate mode: absolute x,y */}
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

          {/* Window mode: window title + offset */}
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
          <input value={String(node.data.key || '')} onChange={(e) => update('key', e.target.value)} />
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
        </>
      )}

      {/* ===== LOOP ===== */}
      {nodeType === 'loop' && (
        <>
          <TemplatePicker
            templateId={node.data.template_id as string | undefined}
            onChange={(id) => update('template_id', id)}
          />
          <div className="config-field">
            <label>{t('config.maxIterations')}</label>
            <input type="number" value={String(node.data.max_iterations ?? 10)} onChange={(e) => update('max_iterations', Number(e.target.value))} />
          </div>
          <div className="config-field">
            <label>{t('config.stopWhen')}</label>
            <select value={String(node.data.stop_when || 'found')} onChange={(e) => update('stop_when', e.target.value)}>
              <option value="found">{t('config.stopWhen.found')}</option>
              <option value="not_found">{t('config.stopWhen.notFound')}</option>
            </select>
          </div>
          <div className="config-field">
            <label>{t('config.intervalMs')}</label>
            <input type="number" value={String(node.data.interval_ms ?? 1000)} onChange={(e) => update('interval_ms', Number(e.target.value))} />
          </div>
        </>
      )}
    </div>
  )
}
