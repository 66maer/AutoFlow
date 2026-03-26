import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  SelectionMode,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { workflows as api, templates as templatesApi } from '../api/client'
import { useI18n } from '../i18n'
import FlowNode from '../components/FlowNode'
import NodeConfigPanel from '../components/NodeConfigPanel'
import ContextMenu, { type MenuEntry } from '../components/ContextMenu'
import useUndoRedo from '../hooks/useUndoRedo'
import '../styles/editor.css'

/** Node categories for the palette */
interface NodePreset {
  nodeType: string
  defaultData?: Record<string, unknown>
}

interface NodeCategory {
  key: string
  presets: NodePreset[]
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    key: 'sensor',
    presets: [
      { nodeType: 'find_image', defaultData: { confidence: 0.8 } },
    ],
  },
  {
    key: 'action',
    presets: [
      { nodeType: 'click', defaultData: { click_mode: 'image' } },
      { nodeType: 'key_press' },
      { nodeType: 'type_text' },
      { nodeType: 'wait', defaultData: { ms: 1000 } },
      { nodeType: 'combo', defaultData: { steps: [] } },
    ],
  },
  {
    key: 'control',
    presets: [
      { nodeType: 'branch' },
      { nodeType: 'loop', defaultData: { loop_mode: 'count', max_iterations: 10 } },
    ],
  },
]

/** Flat list of all node types */
const ALL_NODE_TYPES = NODE_CATEGORIES.flatMap((c) => c.presets.map((p) => p.nodeType))

/** Default data for each node type */
const DEFAULT_DATA_MAP: Record<string, Record<string, unknown>> = {}
NODE_CATEGORIES.forEach((c) =>
  c.presets.forEach((p) => {
    if (p.defaultData) DEFAULT_DATA_MAP[p.nodeType] = p.defaultData
  }),
)

const nodeTypes = { custom: FlowNode }

const NODE_SPACING_Y = 100

/** Quick-add rules: right-clicking a node shows "add after" options */
const QUICK_ADD_MAP: Record<string, string[]> = {
  find_image: ['click', 'branch', 'wait'],
  click: ['wait', 'find_image', 'key_press'],
  key_press: ['wait', 'type_text'],
  type_text: ['wait', 'key_press'],
  wait: ['find_image', 'click'],
  combo: ['find_image', 'wait', 'click'],
  branch: ['find_image', 'click'],
  loop: ['find_image', 'click', 'wait'],
}

interface CtxMenuState {
  x: number
  y: number
  items: MenuEntry[]
}

function WorkflowEditorInner() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reactFlowInstance = useReactFlow()

  const [name, setName] = useState('')
  const [repeatCount, setRepeatCount] = useState(1)
  const [repeatForever, setRepeatForever] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [saving, setSaving] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)

  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] })
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { takeSnapshot, pushSnapshot, updateCurrent, undo, redo } = useUndoRedo(setNodes, setEdges)

  // Track current state for undo/redo
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  useEffect(() => {
    updateCurrent(nodes, edges)
  }, [nodes, edges, updateCurrent])

  // Load workflow
  useEffect(() => {
    if (!id) return
    api.get(id).then((wf) => {
      setName(wf.name)
      setRepeatCount(wf.repeat_count ?? 1)
      setRepeatForever(wf.repeat_forever ?? false)
      const loaded: Node[] = (wf.nodes || []).map((n: Record<string, any>) => {
        let nt = n.data?.nodeType || n.type
        if (nt === 'condition') nt = 'branch' // backward compat
        return {
          id: n.id,
          position: n.position || { x: 0, y: 0 },
          type: 'custom',
          data: { ...n.data, nodeType: nt },
        }
      })
      const loadedEdges = (wf.edges || []) as Edge[]
      setNodes(loaded)
      setEdges(loadedEdges)
      takeSnapshot(loaded, loadedEdges)
    })
  }, [id, setNodes, setEdges, takeSnapshot])

  // ---- Wrapped change handlers that snapshot before mutations ----
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const hasMutation = changes.some(
        (c) => c.type === 'remove' || c.type === 'position' || c.type === 'dimensions',
      )
      // Only snapshot for position start (drag start)
      const hasDragStart = changes.some(
        (c) => c.type === 'position' && c.dragging === true,
      )
      if (hasDragStart) {
        pushSnapshot()
      }
      onNodesChange(changes)
    },
    [onNodesChange, pushSnapshot],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const hasMutation = changes.some((c) => c.type === 'remove')
      if (hasMutation) pushSnapshot()
      onEdgesChange(changes)
    },
    [onEdgesChange, pushSnapshot],
  )

  const onConnect = useCallback(
    (conn: Connection) => {
      pushSnapshot()
      setEdges((eds) => addEdge(conn, eds))
    },
    [setEdges, pushSnapshot],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => setSelectedNode(node),
    [],
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setCtxMenu(null)
  }, [])

  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      pushSnapshot()
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n)),
      )
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev))
    },
    [setNodes, pushSnapshot],
  )

  // ---- Add node ----
  const addNode = useCallback((nodeType: string, position?: { x: number; y: number }) => {
    pushSnapshot()
    setNodes((currentNodes) => {
      const lastNode = currentNodes.length > 0
        ? currentNodes.reduce((a, b) =>
            (a.position.y > b.position.y) ? a : (a.position.y === b.position.y && a.position.x >= b.position.x) ? a : b
          )
        : null

      const newPosition = position
        ? position
        : lastNode
          ? { x: lastNode.position.x, y: lastNode.position.y + NODE_SPACING_Y }
          : { x: 250, y: 80 }

      const defaultData: Record<string, unknown> = { nodeType, ...DEFAULT_DATA_MAP[nodeType] }

      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: 'custom',
        position: newPosition,
        data: defaultData,
      }

      if (lastNode && !position) {
        const newEdge: Edge = {
          id: `e_${lastNode.id}_${newNode.id}`,
          source: lastNode.id,
          target: newNode.id,
        }
        setEdges((eds) => [...eds, newEdge])
      }

      return [...currentNodes, newNode]
    })
  }, [pushSnapshot, setNodes, setEdges])

  /** Add a node after a specific source node */
  const addNodeAfter = useCallback((sourceNodeId: string, nodeType: string) => {
    pushSnapshot()
    setNodes((currentNodes) => {
      const source = currentNodes.find((n) => n.id === sourceNodeId)
      if (!source) return currentNodes

      const newPosition = { x: source.position.x, y: source.position.y + NODE_SPACING_Y }
      const defaultData: Record<string, unknown> = { nodeType, ...DEFAULT_DATA_MAP[nodeType] }

      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: 'custom',
        position: newPosition,
        data: defaultData,
      }

      const newEdge: Edge = {
        id: `e_${sourceNodeId}_${newNode.id}`,
        source: sourceNodeId,
        target: newNode.id,
      }
      setEdges((eds) => [...eds, newEdge])

      return [...currentNodes, newNode]
    })
  }, [pushSnapshot, setNodes, setEdges])

  // ---- Delete selected ----
  const deleteSelected = useCallback(() => {
    const selected = nodesRef.current.filter((n) => n.selected)
    if (selected.length === 0 && selectedNode) {
      // Delete the panel-selected node
      pushSnapshot()
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
      setSelectedNode(null)
      return
    }
    if (selected.length === 0) return
    pushSnapshot()
    const ids = new Set(selected.map((n) => n.id))
    setNodes((nds) => nds.filter((n) => !ids.has(n.id)))
    setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)))
    setSelectedNode(null)
  }, [selectedNode, pushSnapshot, setNodes, setEdges])

  // ---- Clipboard ----
  const getSelectedNodes = useCallback(() => {
    const sel = nodesRef.current.filter((n) => n.selected)
    if (sel.length === 0 && selectedNode) {
      return [nodesRef.current.find((n) => n.id === selectedNode.id)].filter(Boolean) as Node[]
    }
    return sel
  }, [selectedNode])

  const copySelected = useCallback(() => {
    const sel = getSelectedNodes()
    if (sel.length === 0) return
    const ids = new Set(sel.map((n) => n.id))
    const relEdges = edgesRef.current.filter((e) => ids.has(e.source) && ids.has(e.target))
    clipboardRef.current = { nodes: structuredClone(sel), edges: structuredClone(relEdges) }
  }, [getSelectedNodes])

  const cutSelected = useCallback(() => {
    copySelected()
    deleteSelected()
  }, [copySelected, deleteSelected])

  const pasteClipboard = useCallback(() => {
    const { nodes: clipNodes, edges: clipEdges } = clipboardRef.current
    if (clipNodes.length === 0) return
    pushSnapshot()

    const ts = Date.now()
    const idMap = new Map<string, string>()
    const offset = { x: 40, y: 40 }

    const newNodes = clipNodes.map((n, i) => {
      const newId = `${(n.data as any).nodeType || 'node'}_${ts}_${i}`
      idMap.set(n.id, newId)
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
        selected: true,
      }
    })

    const newEdges = clipEdges
      .map((e) => {
        const src = idMap.get(e.source)
        const tgt = idMap.get(e.target)
        if (!src || !tgt) return null
        return { ...e, id: `e_${src}_${tgt}`, source: src, target: tgt }
      })
      .filter(Boolean) as Edge[]

    // Deselect old nodes
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes])
    setEdges((eds) => [...eds, ...newEdges])
  }, [pushSnapshot, setNodes, setEdges])

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })))
  }, [setNodes])

  const selectedNodeRef = useRef(selectedNode)
  selectedNodeRef.current = selectedNode

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      // Don't intercept when focus is inside config panel (e.g. template drop zone)
      if ((e.target as HTMLElement).closest('.node-config-panel')) return

      // Space for pan mode
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setSpaceHeld(true)
        return
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            undo()
            return
          case 'y':
            e.preventDefault()
            redo()
            return
          case 'c':
            e.preventDefault()
            copySelected()
            return
          case 'x':
            e.preventDefault()
            cutSelected()
            return
          case 'v':
            // Don't preventDefault yet — let the paste event fire for image handling
            return
          case 'a':
            e.preventDefault()
            selectAll()
            return
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false)
      }
    }

    // Global paste handler: image paste → find_image node, else → node clipboard paste
    const handlePaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      // Let config panel handle its own paste
      if ((e.target as HTMLElement).closest('.node-config-panel')) return

      const items = e.clipboardData?.items
      if (items) {
        // Check for image data first
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const sel = selectedNodeRef.current
            if (sel && (sel.data as any).nodeType === 'find_image') {
              e.preventDefault()
              const blob = item.getAsFile()
              if (blob) {
                templatesApi.upload(blob, 'paste.png').then((res) => {
                  handleNodeDataChange(sel.id, { ...sel.data, template_id: res.id })
                })
              }
              return
            }
          }
        }
      }

      // No image or no find_image selected → do node clipboard paste
      e.preventDefault()
      pasteClipboard()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('paste', handlePaste)
    }
  }, [undo, redo, copySelected, cutSelected, pasteClipboard, selectAll, deleteSelected, handleNodeDataChange])

  // ---- Drag from palette ----
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/reactflow-nodetype')
      if (!nodeType) return

      const bounds = wrapperRef.current?.getBoundingClientRect()
      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX - (bounds?.left || 0),
        y: e.clientY - (bounds?.top || 0),
      })

      pushSnapshot()
      const defaultData: Record<string, unknown> = { nodeType, ...DEFAULT_DATA_MAP[nodeType] }
      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: 'custom',
        position,
        data: defaultData,
      }
      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance, pushSnapshot, setNodes],
  )

  // ---- Context menus ----
  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault()
      e.stopPropagation()

      const nodeType = (node.data as any).nodeType as string
      const quickAddTypes = QUICK_ADD_MAP[nodeType] || ALL_NODE_TYPES

      const items: MenuEntry[] = [
        { label: t('ctx.copy'), shortcut: 'Ctrl+C', onClick: () => { setSelectedNode(node); copySelected() } },
        { label: t('ctx.cut'), shortcut: 'Ctrl+X', onClick: () => { setSelectedNode(node); cutSelected() } },
        { label: t('ctx.delete'), shortcut: 'Del', onClick: () => {
          pushSnapshot()
          setNodes((nds) => nds.filter((n) => n.id !== node.id))
          setEdges((eds) => eds.filter((ed) => ed.source !== node.id && ed.target !== node.id))
          setSelectedNode(null)
        }},
        { separator: true },
        ...quickAddTypes.map((nt) => ({
          label: `${t('ctx.addAfter')} ${t(`node.${nt}` as any)}`,
          onClick: () => addNodeAfter(node.id, nt),
        })),
      ]

      setCtxMenu({ x: e.clientX, y: e.clientY, items })
    },
    [t, copySelected, cutSelected, pushSnapshot, setNodes, setEdges, addNodeAfter],
  )

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault()

      // Convert screen position to flow position
      const bounds = wrapperRef.current?.getBoundingClientRect()
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: (e as React.MouseEvent).clientX - (bounds?.left || 0),
        y: (e as React.MouseEvent).clientY - (bounds?.top || 0),
      })

      const items: MenuEntry[] = [
        { label: t('ctx.paste'), shortcut: 'Ctrl+V', onClick: pasteClipboard, disabled: clipboardRef.current.nodes.length === 0 },
        { label: t('ctx.selectAll'), shortcut: 'Ctrl+A', onClick: selectAll },
        { label: t('ctx.undo'), shortcut: 'Ctrl+Z', onClick: undo },
        { label: t('ctx.redo'), shortcut: 'Ctrl+Y', onClick: redo },
        { separator: true },
        ...ALL_NODE_TYPES.map((nt) => ({
          label: `${t('ctx.add')} ${t(`node.${nt}` as any)}`,
          onClick: () => addNode(nt, flowPosition),
        })),
      ]

      setCtxMenu({ x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY, items })
    },
    [t, reactFlowInstance, pasteClipboard, selectAll, undo, redo, addNode],
  )

  // ---- Save / Run ----
  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const saveNodes = nodes.map((n) => {
        const nt = (n.data as Record<string, any>).nodeType || 'click'
        return {
          id: n.id,
          type: nt,
          position: n.position,
          data: n.data,
        }
      })
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

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return
    pushSnapshot()
    const nodeId = selectedNode.id
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode(null)
  }, [selectedNode, pushSnapshot, setNodes, setEdges])

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

      <div className="editor-canvas" ref={wrapperRef}>
        <div className="node-palette">
          {NODE_CATEGORIES.map((cat) => (
            <div key={cat.key} className="palette-group">
              <div className="palette-title">{t(`category.${cat.key}` as any)}</div>
              {cat.presets.map((preset) => (
                <div
                  key={preset.nodeType}
                  className={`palette-item palette-item--${cat.key}`}
                  onClick={() => addNode(preset.nodeType)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow-nodetype', preset.nodeType)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                >
                  {t(`node.${preset.nodeType}` as any)}
                </div>
              ))}
            </div>
          ))}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          /* Selection: left-click drag = box select */
          selectionOnDrag={!spaceHeld}
          selectionMode={SelectionMode.Partial}
          /* Pan: space+left-drag or middle-mouse drag */
          panOnDrag={spaceHeld ? true : [1]}
          panOnScroll={false}
          /* Zoom: scroll wheel */
          zoomOnScroll={true}
          /* Disable default delete key (we handle it ourselves) */
          deleteKeyCode={null}
          multiSelectionKeyCode="Control"
        >
          <Controls />
          <Background />
        </ReactFlow>

        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={ctxMenu.items}
            onClose={() => setCtxMenu(null)}
          />
        )}

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

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  )
}
