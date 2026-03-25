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
import FlowNode from '../components/FlowNode'
import NodeConfigPanel from '../components/NodeConfigPanel'
import '../styles/editor.css'

const NODE_TYPES_LIST = ['capture', 'find_image', 'click', 'key_press', 'type_text', 'wait', 'condition', 'loop']

const nodeTypes = { custom: FlowNode }

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(id).then((wf) => {
      setName(wf.name)
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
    const newNode: Node = {
      id: `${nodeType}_${Date.now()}`,
      type: 'custom',
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { nodeType },
    }
    setNodes((nds) => [...nds, newNode])
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const saveNodes = nodes.map((n) => ({
        id: n.id,
        type: (n.data as Record<string, any>).nodeType || 'capture',
        position: n.position,
        data: n.data,
      }))
      await api.update(id, { name, nodes: saveNodes as any, edges: edges as any })
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
            &larr; Back
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghost" onClick={handleRun}>Run</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="editor-canvas">
        <div className="node-palette">
          {NODE_TYPES_LIST.map((t) => (
            <div key={t} className="palette-item" onClick={() => addNode(t)}>
              {t.replace('_', ' ')}
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
          />
        )}
      </div>
    </div>
  )
}
