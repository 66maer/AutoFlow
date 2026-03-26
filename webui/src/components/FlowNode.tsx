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
  CheckIcon,
} from '@heroicons/react/20/solid'
import type { ComponentType, SVGProps } from 'react'

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

function getNodeIcon(nodeType: string): ComponentType<SVGProps<SVGSVGElement>> {
  switch (nodeType) {
    case 'find_image': return MagnifyingGlassIcon
    case 'click': return CursorArrowRaysIcon
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
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} />
          <div className="node-handle-labels">
            <span className="handle-tag handle-tag--true" style={{ left: '30%' }} title={t('handle.branch.true')}>
              {t('handle.branch.true.short')}
            </span>
            <span className="handle-tag handle-tag--false" style={{ left: '70%' }} title={t('handle.branch.false')}>
              {t('handle.branch.false.short')}
            </span>
          </div>
        </>
      ) : isLoop ? (
        <>
          {/* Left handle: loop-back entry from body's last node */}
          <Handle type="target" position={Position.Left} id="loop_back" />
          <div className="node-handle-labels node-handle-labels--left">
            <span className="handle-tag handle-tag--loop-back" title={t('handle.loop.back')}>
              {t('handle.loop.back.short')}
            </span>
          </div>
          {/* Bottom: body output */}
          <Handle type="source" position={Position.Bottom} id="body" style={{ left: '35%' }} />
          {/* Bottom-right: done/exit */}
          <Handle type="source" position={Position.Bottom} id="done" style={{ left: '70%' }} />
          <div className="node-handle-labels">
            <span className="handle-tag handle-tag--body" style={{ left: '35%' }} title={t('handle.loop.body')}>
              {t('handle.loop.body.short')}
            </span>
            <span className="handle-tag handle-tag--done" style={{ left: '70%' }} title={t('handle.loop.done')}>
              {t('handle.loop.done.short')}
            </span>
          </div>
        </>
      ) : hasTimeout ? (
        <>
          <Handle type="source" position={Position.Bottom} id="success" style={{ left: '30%' }} />
          <Handle type="source" position={Position.Bottom} id="timeout" style={{ left: '70%' }} />
          <div className="node-handle-labels">
            <span className="handle-tag handle-tag--success" style={{ left: '30%' }} title={t('handle.timeout.success')}>
              <CheckIcon width={10} height={10} />
            </span>
            <span className="handle-tag handle-tag--timeout" style={{ left: '70%' }} title={t('handle.timeout.timeout')}>
              <ClockIcon width={10} height={10} />
            </span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  )
}
