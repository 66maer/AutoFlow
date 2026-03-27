import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useI18n } from '../i18n'
import { templates } from '../api/client'
import {
  MagnifyingGlassIcon,
  CursorArrowRaysIcon,
  CommandLineIcon,
  LinkIcon,
  PencilIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  CameraIcon,
} from '@heroicons/react/20/solid'
import type { ComponentType, SVGProps } from 'react'

/** Map nodeType → category for styling */
function getNodeCategory(nodeType: string): string {
  switch (nodeType) {
    case 'find_image':
    case 'capture':
      return 'sensor'
    case 'click':
    case 'mouse_action':
    case 'key_press':
    case 'type_text':
    case 'wait':
    case 'combo':
      return 'action'
    case 'branch':
    case 'condition':
    case 'loop':
      return 'control'
    default:
      return 'action'
  }
}

function getNodeIcon(nodeType: string): ComponentType<SVGProps<SVGSVGElement>> {
  switch (nodeType) {
    case 'find_image': return MagnifyingGlassIcon
    case 'capture': return CameraIcon
    case 'click':
    case 'mouse_action': return CursorArrowRaysIcon
    case 'key_press': return CommandLineIcon
    case 'combo': return LinkIcon
    case 'type_text': return PencilIcon
    case 'wait': return ClockIcon
    case 'branch':
    case 'condition': return ArrowsRightLeftIcon
    case 'loop': return ArrowPathIcon
    default: return Cog6ToothIcon
  }
}

export default function FlowNode({ data, type }: NodeProps) {
  const { t } = useI18n()
  const nodeType = (data.nodeType as string) || type || 'click'
  const category = getNodeCategory(nodeType)
  const label = t(`node.${nodeType}` as any) || nodeType
  const Icon = getNodeIcon(nodeType)

  const isBranch = nodeType === 'branch' || nodeType === 'condition'
  const isLoop = nodeType === 'loop'
  const hasTimeout = nodeType === 'find_image' && data.timeout_enabled

  // Build detail text
  let detail = ''
  switch (nodeType) {
    case 'click':
    case 'mouse_action': {
      const action = (data.action as string) || 'click'
      const btn = (data.button as string) || 'left'

      // Scroll actions
      if (btn === 'middle' && (action === 'scroll_up' || action === 'scroll_down')) {
        detail = t(`node.mouse_action.${action}` as any, { amount: String(data.scroll_amount || 3) })
        break
      }

      // Click / double-click
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
      if (action === 'double_click') detail = t('node.mouse_action.double_click') + ' ' + detail
      if (btn !== 'left' && action !== 'scroll_up' && action !== 'scroll_down') detail += ` [${t(`node.click.${btn}` as any) || btn}]`
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
    case 'capture': {
      const mode = (data.capture_mode as string) || 'fullscreen'
      if (mode === 'region') {
        detail = t('node.capture.region')
      } else {
        detail = t('node.capture.fullscreen')
      }
      if (data.save_to) detail += ` → ${data.save_to}`
      break
    }
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
        <span className="node-icon"><Icon width={16} height={16} /></span>
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
          <Handle type="source" position={Position.Bottom} id="true" className="handle-dot handle-dot--true" style={{ left: '30%' }} title={t('handle.branch.true')} />
          <Handle type="source" position={Position.Bottom} id="false" className="handle-dot handle-dot--false" style={{ left: '70%' }} title={t('handle.branch.false')} />
        </>
      ) : isLoop ? (
        <>
          {/* Left: loop-back entry */}
          <Handle type="target" position={Position.Left} id="loop_back" className="handle-dot handle-dot--loop-back" title={t('handle.loop.back')} />
          {/* Bottom: body output + done */}
          <Handle type="source" position={Position.Bottom} id="body" className="handle-dot handle-dot--body" style={{ left: '35%' }} title={t('handle.loop.body')} />
          <Handle type="source" position={Position.Bottom} id="done" className="handle-dot handle-dot--done" style={{ left: '70%' }} title={t('handle.loop.done')} />
        </>
      ) : hasTimeout ? (
        <>
          <Handle type="source" position={Position.Bottom} id="success" className="handle-dot handle-dot--success" style={{ left: '30%' }} title={t('handle.timeout.success')} />
          <Handle type="source" position={Position.Bottom} id="timeout" className="handle-dot handle-dot--timeout" style={{ left: '70%' }} title={t('handle.timeout.timeout')} />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  )
}
