import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

const NODE_LABELS: Record<string, string> = {
  capture: 'Capture',
  find_image: 'Find Image',
  click: 'Click',
  key_press: 'Key Press',
  type_text: 'Type Text',
  wait: 'Wait',
  condition: 'Condition',
  loop: 'Loop',
}

function getDetail(nodeType: string, data: Record<string, unknown>): string {
  switch (nodeType) {
    case 'click': return data.x != null ? `(${data.x}, ${data.y})` : 'auto'
    case 'key_press': return String(data.key || '')
    case 'type_text': return String(data.text || '').slice(0, 20)
    case 'wait': return `${data.ms || 1000}ms`
    case 'find_image': return String(data.template_path || '').split('/').pop() || ''
    case 'loop': return `max ${data.max_iterations || 10}`
    default: return ''
  }
}

export default function FlowNode({ data, type }: NodeProps) {
  const nodeType = (data.nodeType as string) || type || 'capture'
  const detail = getDetail(nodeType, data)

  return (
    <div className={`flow-node ${nodeType}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-label">{NODE_LABELS[nodeType] || nodeType}</div>
      {detail && <div className="node-detail">{detail}</div>}
      {nodeType === 'condition' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  )
}
