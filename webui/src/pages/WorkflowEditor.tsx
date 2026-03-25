import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { workflows as api } from '../api/client'
import { useI18n } from '../i18n'
import FlowNode from '../components/FlowNode'
import NodeConfigPanel from '../components/NodeConfigPanel'
import '../styles/editor.css'

const NODE_TYPES_LIST = ['find_image', 'click', 'key_press', 'type_text', 'wait', 'condition', 'loop']

const nodeTypes = { custom: FlowNode }

const NODE_SPACING_Y = 100

export default function WorkflowEditor() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [repeatCount, setRepeatCount] = useState(1)
  const [repeatForever, setRepeatForever] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(id).then((wf) => {
      setName(wf.name)
      setRepeatCount(wf.repeat_count ?? 1)
      setRepeatForever(wf.repeat_forever ?? false)
      const loaded: Node[] = (wf.nodes || []).map((n: Record<string, any>) => ({
        id: n.id,
        position: n.position || { x: 0, y: 0 },
        type: 'custom',
        data: { ...n.data, nodeType: n.data?.nodeType || n.type },
      }))
      setNodes(loaded)
      setEdges((wf.edges || []) as Edge[])
    })
  }, [id, setNodes, setEdges])

  const onConnect = useCallback(
    (conn: Connection) => setEdges((eds) => addEdge(conn, eds)),
    [setEdges],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => setSelectedNode(node),
    [],
  )

  const onPaneClick = useCallback(() => setSelectedNode(null), [])

  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n)),
      )
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev))
    },
    [setNodes],
  )

  const addNode = (nodeType: string) => {
    setNodes((currentNodes) => {
      // Find the last node to auto-position and auto-connect
      const lastNode = currentNodes.length > 0
        ? currentNodes.reduce((a, b) =>
            (a.position.y > b.position.y) ? a : (a.position.y === b.position.y && a.position.x >= b.position.x) ? a : b
          )
        : null

      const newPosition = lastNode
        ? { x: lastNode.position.x, y: lastNode.position.y + NODE_SPACING_Y }
        : { x: 250, y: 80 }

      const defaultData: Record<string, unknown> = { nodeType }
      if (nodeType === 'click') {
        defaultData.click_mode = 'image'
      }

      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: 'custom',
        position: newPosition,
        data: defaultData,
      }

      // Auto-connect from last node
      if (lastNode) {
        const newEdge: Edge = {
          id: `e_${lastNode.id}_${newNode.id}`,
          source: lastNode.id,
          target: newNode.id,
        }
        setEdges((eds) => [...eds, newEdge])
      }

      return [...currentNodes, newNode]
    })
  }

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return
    const nodeId = selectedNode.id
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode(null)
  }, [selectedNode, setNodes, setEdges])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const saveNodes = nodes.map((n) => ({
        id: n.id,
        type: (n.data as Record<string, any>).nodeType || 'click',
        position: n.position,
        data: n.data,
      }))
      await api.update(id, {
        name,
        nodes: saveNodes as any,
        edges: edges as any,
        repeat_count: repeatForever ? 0 : repeatCount,
        repeat_forever: repeatForever,
      } as any)
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    if (!id) return
    await handleSave()
    await api.run(id)
  }

  return (
    <div className="editor-container">
      <div className="page-header">
        <div className="editor-toolbar">
          <button className="ghost" onClick={() => navigate('/workflows')}>
            {t('common.back')}
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('editor.namePlaceholder')} />
        </div>
        <div className="editor-actions">
          <div className="repeat-setting">
            <label className="repeat-checkbox">
              <input
                type="checkbox"
                checked={repeatForever}
                onChange={(e) => setRepeatForever(e.target.checked)}
              />
              {t('editor.repeatForever')}
            </label>
            {!repeatForever && (
              <>
                <span className="repeat-label">{t('editor.repeatCount')}</span>
                <input
                  type="number"
                  className="repeat-input"
                  min={1}
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Math.max(1, Number(e.target.value)))}
                />
              </>
            )}
          </div>
          <button className="ghost" onClick={handleRun}>{t('common.run')}</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      <div className="editor-canvas">
        <div className="node-palette">
          <div className="palette-title">{t('nav.workflows')}</div>
          {NODE_TYPES_LIST.map((nodeType) => (
            <div key={nodeType} className="palette-item" onClick={() => addNode(nodeType)}>
              {t(`node.${nodeType}` as any)}
            </div>
          ))}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>

        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onChange={handleNodeDataChange}
            onClose={() => setSelectedNode(null)}
            onDelete={handleDeleteNode}
          />
        )}
      </div>
    </div>
  )
}
