import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useI18n } from '../i18n'
import { templates } from '../api/client'

function getNodeIcon(nodeType: string): string {
  switch (nodeType) {
    case 'find_image': return '🔍'
    case 'click': return '🖱️'
    case 'key_press': return '⌨️'
    case 'type_text': return '✏️'
    case 'wait': return '⏱️'
    case 'condition': return '🔀'
    case 'loop': return '🔄'
    default: return '⚙️'
  }
}

export default function FlowNode({ data, type }: NodeProps) {
  const { t } = useI18n()
  const nodeType = (data.nodeType as string) || type || 'click'
  const label = t(`node.${nodeType}` as any) || nodeType
  const icon = getNodeIcon(nodeType)

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
    case 'key_press':
      detail = String(data.key || '')
      break
    case 'type_text': {
      const txt = String(data.text || '')
      detail = txt.length > 24 ? txt.slice(0, 24) + '…' : txt
      break
    }
    case 'wait':
      detail = t('node.wait.detail', { ms: String(data.ms || 1000) })
      break
    case 'find_image':
      if (!data.template_id) detail = t('node.find_image.paste')
      break
    case 'loop':
      detail = t('node.loop.detail', { max: String(data.max_iterations || 10) })
      break
  }

  // Template thumbnail for find_image and loop nodes
  const templateId = data.template_id as string | undefined
  const showThumbnail = (nodeType === 'find_image' || nodeType === 'loop') && templateId

  return (
    <div className={`flow-node ${nodeType}`}>
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
