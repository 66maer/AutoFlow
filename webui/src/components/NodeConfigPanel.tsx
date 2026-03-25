import type { Node } from '@xyflow/react'

interface Props {
  node: Node
  onChange: (id: string, data: Record<string, unknown>) => void
  onClose: () => void
}

export default function NodeConfigPanel({ node, onChange, onClose }: Props) {
  const nodeType = (node.data.nodeType as string) || node.type || ''

  const update = (key: string, value: unknown) => {
    onChange(node.id, { ...node.data, [key]: value })
  }

  return (
    <div className="node-config-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3>{nodeType}</h3>
        <button className="ghost" onClick={onClose} style={{ padding: '2px 8px' }}>x</button>
      </div>

      {(nodeType === 'click') && (
        <>
          <div className="config-field">
            <label>X</label>
            <input type="number" value={String(node.data.x ?? '')} onChange={(e) => update('x', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div className="config-field">
            <label>Y</label>
            <input type="number" value={String(node.data.y ?? '')} onChange={(e) => update('y', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div className="config-field">
            <label>Button</label>
            <select value={String(node.data.button || 'left')} onChange={(e) => update('button', e.target.value)}>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="middle">Middle</option>
            </select>
          </div>
        </>
      )}

      {nodeType === 'key_press' && (
        <div className="config-field">
          <label>Key</label>
          <input value={String(node.data.key || '')} onChange={(e) => update('key', e.target.value)} />
        </div>
      )}

      {nodeType === 'type_text' && (
        <div className="config-field">
          <label>Text</label>
          <input value={String(node.data.text || '')} onChange={(e) => update('text', e.target.value)} />
        </div>
      )}

      {nodeType === 'wait' && (
        <div className="config-field">
          <label>Wait (ms)</label>
          <input type="number" value={String(node.data.ms ?? 1000)} onChange={(e) => update('ms', Number(e.target.value))} />
        </div>
      )}

      {nodeType === 'find_image' && (
        <>
          <div className="config-field">
            <label>Template Path</label>
            <input value={String(node.data.template_path || '')} onChange={(e) => update('template_path', e.target.value)} />
          </div>
          <div className="config-field">
            <label>Save to variable</label>
            <input value={String(node.data.save_to || '')} onChange={(e) => update('save_to', e.target.value)} />
          </div>
        </>
      )}

      {nodeType === 'loop' && (
        <>
          <div className="config-field">
            <label>Template Path</label>
            <input value={String(node.data.template_path || '')} onChange={(e) => update('template_path', e.target.value)} />
          </div>
          <div className="config-field">
            <label>Max Iterations</label>
            <input type="number" value={String(node.data.max_iterations ?? 10)} onChange={(e) => update('max_iterations', Number(e.target.value))} />
          </div>
          <div className="config-field">
            <label>Stop When</label>
            <select value={String(node.data.stop_when || 'found')} onChange={(e) => update('stop_when', e.target.value)}>
              <option value="found">Image Found</option>
              <option value="not_found">Image Not Found</option>
            </select>
          </div>
          <div className="config-field">
            <label>Interval (ms)</label>
            <input type="number" value={String(node.data.interval_ms ?? 1000)} onChange={(e) => update('interval_ms', Number(e.target.value))} />
          </div>
        </>
      )}
    </div>
  )
}
