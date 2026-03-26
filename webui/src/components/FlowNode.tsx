import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useI18n } from '../i18n'
import { templates } from '../api/client'

/** Map nodeType → category for styling */
function getNodeCategory(nodeType: string): string {
  switch (nodeType) {
    case 'find_image':
      return 'sensor'
    case 'click':
    case 'key_press':
    case 'type_text':
    case 'wait':
    case 'combo':
      return 'action'
    case 'branch':
    case 'condition':
      return 'control'
    case 'loop':
      return 'control'
    default:
      return 'action'
  }
}

function getNodeIcon(nodeType: string): string {
  switch (nodeType) {
    case 'find_image': return '🔍'
    case 'click': return '🖱️'
    case 'key_press': return '⌨️'
    case 'combo': return '🔗'
    case 'type_text': return '✏️'
    case 'wait': return '⏱️'
    case 'branch':
    case 'condition': return '🔀'
    case 'loop': return '🔄'
    default: return '⚙️'
  }
}

export default function FlowNode({ data, type }: NodeProps) {
  const { t } = useI18n()
  const nodeType = (data.nodeType as string) || type || 'click'
  const category = getNodeCategory(nodeType)
  const label = t(`node.${nodeType}` as any) || nodeType
  const icon = getNodeIcon(nodeType)

  const isBranch = nodeType === 'branch' || nodeType === 'condition'
  const hasTimeout = nodeType === 'find_image' && data.timeout_enabled

  // Build detail text
  let detail = ''
  switch (nodeType) {
    case 'click': {
      const mode = (data.click_mode as string) || 'image'
      if (mode === 'image') {
        const ox = Number(data.offset_x || 0)
        const oy = Number(data.offset_y || 0)
        if (ox || oy) {
          detail = t('node.click.image.offset', { x: String(ox), y: String(oy) })
        } else {
          detail = t('node.click.image')
        }
      } else if (mode === 'coord') {
        detail = data.x != null ? t('node.click.coord', { x: String(data.x), y: String(data.y) }) : ''
      } else {
        detail = t('node.click.window')
      }
      const btn = (data.button as string) || 'left'
      if (btn !== 'left') detail += ` [${t(`node.click.${btn}` as any)}]`
      break
    }
    case 'key_press': {
      const keys = String(data.keys || data.key || '')
      if (keys) {
        detail = keys.split('+').map((k) => {
          if (k === 'ctrl') return 'Ctrl'
          if (k === 'shift') return 'Shift'
          if (k === 'alt') return 'Alt'
          if (k === 'meta') return 'Win'
          return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1)
        }).join('+')
      }
      break
    }
    case 'combo': {
      const steps = (data.steps as any[]) || []
      detail = t('node.combo.steps', { count: String(steps.length) })
      break
    }
    case 'type_text': {
      const txt = String(data.text || '')
      detail = txt.length > 24 ? txt.slice(0, 24) + '…' : txt
      break
    }
    case 'wait':
      detail = t('node.wait.detail', { ms: String(data.ms || 1000) })
      break
    case 'find_image':
      if (!data.template_id) {
        detail = t('node.find_image.paste')
      } else if (hasTimeout) {
        detail = t('node.find_image.timeout', { ms: String(data.timeout_ms || 5000) })
      }
      break
    case 'loop':
      if (data.loop_mode === 'infinite') {
        detail = t('node.loop.infinite')
      } else {
        detail = t('node.loop.detail', { max: String(data.max_iterations || 10) })
      }
      break
  }

  // Template thumbnail for find_image and loop nodes
  const templateId = data.template_id as string | undefined
  const showThumbnail = (nodeType === 'find_image' || nodeType === 'loop') && templateId

  return (
    <div className={`flow-node flow-node--${category} ${nodeType}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className="node-icon">{icon}</span>
        <span className="node-label">{label}</span>
      </div>
      {showThumbnail && (
        <div className="node-thumbnail">
          <img
            src={templates.previewUrl(templateId!)}
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}
      {detail && <div className="node-detail">{detail}</div>}
      {isBranch ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} />
        </>
      ) : hasTimeout ? (
        <>
          <Handle type="source" position={Position.Bottom} id="success" style={{ left: '30%' }} />
          <Handle type="source" position={Position.Bottom} id="timeout" style={{ left: '70%' }} />
          <div className="node-handle-labels">
            <span style={{ left: '30%' }}>✓</span>
            <span style={{ left: '70%' }}>⏱</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  )
}
