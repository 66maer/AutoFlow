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
  MarkerType,
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
      { nodeType: 'capture', defaultData: { capture_mode: 'fullscreen' } },
      { nodeType: 'find_image', defaultData: { confidence: 0.8 } },
    ],
  },
  {
    key: 'action',
    presets: [
      { nodeType: 'mouse_action', defaultData: { click_mode: 'image', button: 'left', action: 'click' } },
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
  capture: ['find_image', 'mouse_action', 'branch'],
  find_image: ['mouse_action', 'branch', 'wait'],
  mouse_action: ['wait', 'find_image', 'key_press'],
  click: ['wait', 'find_image', 'key_press'], // backward compat
  key_press: ['wait', 'type_text'],
  type_text: ['wait', 'key_press'],
  wait: ['find_image', 'mouse_action', 'capture'],
  combo: ['find_image', 'wait', 'mouse_action'],
  branch: ['find_image', 'mouse_action', 'capture'],
  loop: ['find_image', 'mouse_action', 'wait'],
}

interface CtxMenuState {
  x: number
  y: number
  items: MenuEntry[]
}

/** Detect if adding an edge from source→target would create a cycle (DFS).
 *  Cycles are allowed only when connecting to a loop node's loop_back handle. */
function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  targetHandle: string | null | undefined,
  edges: Edge[],
  nodes: Node[],
): boolean {
  // Allow cycle when connecting to a loop node's loop_back handle
  const targetNode = nodes.find((n) => n.id === targetId)
  if (targetNode && (targetNode.data as any).nodeType === 'loop' && targetHandle === 'loop_back') return false

  // DFS: can we reach sourceId starting from targetId by following existing edges?
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  }

  const visited = new Set<string>()
  const stack = [targetId]
  while (stack.length > 0) {
    const cur = stack.pop()!
    if (cur === sourceId) return true
    if (visited.has(cur)) continue
    visited.add(cur)
    for (const next of adj.get(cur) || []) {
      stack.push(next)
    }
  }
  return false
}

function WorkflowEditorInner() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reactFlowInstance = useReactFlow()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [repeatCount, setRepeatCount] = useState(1)
  const [repeatForever, setRepeatForever] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [saving, setSaving] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(true)
  const [edgeInsertEnabled, setEdgeInsertEnabled] = useState(true)
  /** Ghost edge shown during palette drag for auto-connect / edge-insert preview */
  const [ghostEdges, setGhostEdges] = useState<{ from: { x: number; y: number }; to: { x: number; y: number }; type: 'connect' | 'insert' }[]>([])
  /** Throttle palette drag preview updates */
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null)

  const [magnetEnabled, setMagnetEnabled] = useState(true)
  /**
   * Snap groups: maps nodeId → partnerId for snapped pairs.
   * If A snaps to B: snapGroups has A→B and B→A.
   * The "top" node (smaller y) is the source; "bottom" is target.
   */
  const [snapGroups, setSnapGroups] = useState<Map<string, string>>(new Map())

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
      setDescription(wf.description || '')
      setRepeatCount(wf.repeat_count ?? 1)
      setRepeatForever(wf.repeat_forever ?? false)
      const loaded: Node[] = (wf.nodes || []).map((n: Record<string, any>) => {
        let nt = n.data?.nodeType || n.type
        if (nt === 'condition') nt = 'branch' // backward compat
        if (nt === 'click') nt = 'mouse_action' // backward compat
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
  const snapGroupsRef = useRef(snapGroups)
  snapGroupsRef.current = snapGroups

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Only snapshot for position start (drag start)
      const hasDragStart = changes.some(
        (c) => c.type === 'position' && c.dragging === true,
      )
      if (hasDragStart) {
        pushSnapshot()
      }

      // Snap group: propagate position changes to partner nodes
      const posChanges = changes.filter(
        (c): c is NodeChange & { type: 'position'; id: string; position?: { x: number; y: number }; dragging?: boolean } =>
          c.type === 'position' && !!(c as any).position && (c as any).dragging,
      )
      const extraChanges: NodeChange[] = []
      const currentSnap = snapGroupsRef.current
      for (const pc of posChanges) {
        const partnerId = currentSnap.get(pc.id)
        if (!partnerId) continue
        // Already being dragged? skip
        if (changes.some((c) => c.type === 'position' && (c as any).id === partnerId)) continue
        const draggedNode = nodesRef.current.find((n) => n.id === pc.id)
        const partnerNode = nodesRef.current.find((n) => n.id === partnerId)
        if (!draggedNode || !partnerNode || !pc.position) continue
        // Maintain relative offset
        const dx = pc.position.x - draggedNode.position.x
        const dy = pc.position.y - draggedNode.position.y
        extraChanges.push({
          type: 'position',
          id: partnerId,
          position: { x: partnerNode.position.x + dx, y: partnerNode.position.y + dy },
          dragging: true,
        } as any)
      }

      onNodesChange([...changes, ...extraChanges])
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
      if (!conn.source || !conn.target) return
      if (conn.source === conn.target) return
      if (wouldCreateCycle(conn.source, conn.target, conn.targetHandle, edgesRef.current, nodesRef.current)) return
      pushSnapshot()

      // Loop-back edges: smoothstep with offset so the line routes wide around nodes
      if (conn.targetHandle === 'loop_back') {
        const edge = {
          id: `e_${conn.source}_${conn.target}_lb`,
          source: conn.source,
          target: conn.target,
          sourceHandle: conn.sourceHandle,
          targetHandle: conn.targetHandle,
          type: 'smoothstep' as const,
          pathOptions: { offset: 50, borderRadius: 16 },
        }
        setEdges((eds) => [...eds, edge])
      } else {
        setEdges((eds) => addEdge(conn, eds))
      }
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

  // Counter for offset when adding nodes to avoid overlap
  const addCountRef = useRef(0)

  // ---- Add node ----
  const addNode = useCallback((nodeType: string, position?: { x: number; y: number }) => {
    pushSnapshot()

    let newPosition: { x: number; y: number }
    if (position) {
      // Explicit position (e.g., from context menu)
      newPosition = position
    } else {
      // Place at viewport center with spiral offset to avoid overlap
      const viewport = reactFlowInstance.getViewport()
      const wrapperBounds = wrapperRef.current?.getBoundingClientRect()
      const w = wrapperBounds?.width || 800
      const h = wrapperBounds?.height || 600
      const center = reactFlowInstance.screenToFlowPosition({
        x: w / 2,
        y: h / 2,
      })
      // Spiral offset: each successive add shifts by 30px right and 30px down
      const count = addCountRef.current++
      const offsetX = (count % 5) * 30
      const offsetY = Math.floor(count / 5) * 30
      newPosition = { x: center.x + offsetX - 60, y: center.y + offsetY - 60 }
    }

    const defaultData: Record<string, unknown> = { nodeType, ...DEFAULT_DATA_MAP[nodeType] }

    const newNode: Node = {
      id: `${nodeType}_${Date.now()}`,
      type: 'custom',
      position: newPosition,
      data: defaultData,
    }

    setNodes((nds) => [...nds, newNode])
    // No auto-connect — user manually connects or uses drag proximity
  }, [pushSnapshot, setNodes, reactFlowInstance])

  /** Add a node after a specific source node */
  const addNodeAfter = useCallback((sourceNodeId: string, nodeType: string) => {
    pushSnapshot()
    const source = nodesRef.current.find((n) => n.id === sourceNodeId)
    if (!source) return

    const newPosition = { x: source.position.x, y: source.position.y + NODE_SPACING_Y }
    const defaultData: Record<string, unknown> = { nodeType, ...DEFAULT_DATA_MAP[nodeType] }

    const newNode: Node = {
      id: `${nodeType}_${Date.now()}`,
      type: 'custom',
      position: newPosition,
      data: defaultData,
    }

    setNodes((nds) => [...nds, newNode])

    const newEdge: Edge = {
      id: `e_${sourceNodeId}_${newNode.id}`,
      source: sourceNodeId,
      target: newNode.id,
    }
    setEdges((eds) => [...eds, newEdge])
  }, [pushSnapshot, setNodes, setEdges])

  // ---- Delete selected (nodes + edges) ----
  const deleteSelected = useCallback(() => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected)
    const selectedEdges = edgesRef.current.filter((e) => e.selected)

    // If we have selected edges, delete them
    if (selectedEdges.length > 0) {
      pushSnapshot()
      const edgeIds = new Set(selectedEdges.map((e) => e.id))
      setEdges((eds) => eds.filter((e) => !edgeIds.has(e.id)))
    }

    if (selectedNodes.length === 0 && selectedNode) {
      // Delete the panel-selected node
      pushSnapshot()
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
      setSelectedNode(null)
      return
    }
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return
    if (selectedNodes.length > 0) {
      pushSnapshot()
      const ids = new Set(selectedNodes.map((n) => n.id))
      setNodes((nds) => nds.filter((n) => !ids.has(n.id)))
      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)))
      setSelectedNode(null)
    }
  }, [selectedNode, pushSnapshot, setNodes, setEdges])

  // ---- Drag auto-connect / edge-insert preview ----
  const NODE_HALF_W = 70
  const NODE_HALF_H = 25
  const CONNECT_THRESHOLD = 60

  /** Find the edge closest to a position, if within threshold */
  const findEdgeAtPosition = useCallback(
    (pos: { x: number; y: number }): Edge | null => {
      const THRESHOLD_X = 80
      const THRESHOLD_Y = 20
      const currentNodes = nodesRef.current
      const currentEdges = edgesRef.current

      let bestEdge: Edge | null = null
      let bestDist = Infinity

      for (const edge of currentEdges) {
        const srcNode = currentNodes.find((n) => n.id === edge.source)
        const tgtNode = currentNodes.find((n) => n.id === edge.target)
        if (!srcNode || !tgtNode) continue

        const sx = srcNode.position.x + 70
        const sy = srcNode.position.y + 30
        const tx = tgtNode.position.x + 70
        const ty = tgtNode.position.y + 30

        const minY = Math.min(sy, ty) + THRESHOLD_Y
        const maxY = Math.max(sy, ty) - THRESHOLD_Y
        if (pos.y < minY || pos.y > maxY) continue

        const midX = (sx + tx) / 2
        const dx = Math.abs(pos.x - midX)
        if (dx > THRESHOLD_X) continue

        const dist = Math.hypot(pos.x - midX, pos.y - (sy + ty) / 2)
        if (dist < bestDist) {
          bestDist = dist
          bestEdge = edge
        }
      }

      return bestEdge
    },
    [],
  )


  /** Check if a node has only a single default output handle (no branch/loop/timeout) */
  const isSingleOutput = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId)
    if (!node) return false
    const nt = (node.data as any).nodeType || ''
    // Branch, loop, timeout-enabled find_image have multiple outputs
    if (nt === 'branch' || nt === 'condition' || nt === 'loop') return false
    if (nt === 'find_image' && (node.data as any).timeout_enabled) return false
    return true
  }, [])

  const isSingleInput = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId)
    if (!node) return false
    const nt = (node.data as any).nodeType || ''
    // Loop has loop_back + default input
    if (nt === 'loop') return false
    return true
  }, [])

  const SNAP_THRESHOLD = 15 // px distance for magnet snap

  const onNodeDragStop = useCallback((_: React.MouseEvent, dragNode: Node) => {
    // Magnet snap detection
    if (!magnetEnabled) return
    // Don't snap if already snapped
    if (snapGroupsRef.current.has(dragNode.id)) return

    const dragCx = dragNode.position.x + NODE_HALF_W
    const dragBottom = dragNode.position.y + NODE_HALF_H * 2
    const dragTop = dragNode.position.y

    for (const n of nodesRef.current) {
      if (n.id === dragNode.id) continue
      if (snapGroupsRef.current.has(n.id)) continue

      const ncx = n.position.x + NODE_HALF_W
      const nBottom = n.position.y + NODE_HALF_H * 2
      const nTop = n.position.y
      const dx = Math.abs(dragCx - ncx)

      // Check: drag node below n (n is source, drag is target)
      if (dx < SNAP_THRESHOLD && Math.abs(dragTop - nBottom) < SNAP_THRESHOLD) {
        if (isSingleOutput(n.id) && isSingleInput(dragNode.id)) {
          // Snap: align drag node directly below n
          const snapPos = { x: n.position.x, y: nBottom }
          setNodes((nds) => nds.map((nd) =>
            nd.id === dragNode.id ? { ...nd, position: snapPos } : nd
          ))
          // Auto-connect if no edge exists
          const edgeExists = edgesRef.current.some((e) => e.source === n.id && e.target === dragNode.id)
          if (!edgeExists) {
            setEdges((eds) => [...eds, {
              id: `e_${n.id}_${dragNode.id}`,
              source: n.id,
              target: dragNode.id,
            }])
          }
          setSnapGroups((prev) => {
            const next = new Map(prev)
            next.set(n.id, dragNode.id)
            next.set(dragNode.id, n.id)
            return next
          })
          return
        }
      }

      // Check: drag node above n (drag is source, n is target)
      if (dx < SNAP_THRESHOLD && Math.abs(nTop - dragBottom) < SNAP_THRESHOLD) {
        if (isSingleOutput(dragNode.id) && isSingleInput(n.id)) {
          const snapPos = { x: n.position.x, y: nTop - NODE_HALF_H * 2 }
          setNodes((nds) => nds.map((nd) =>
            nd.id === dragNode.id ? { ...nd, position: snapPos } : nd
          ))
          const edgeExists = edgesRef.current.some((e) => e.source === dragNode.id && e.target === n.id)
          if (!edgeExists) {
            setEdges((eds) => [...eds, {
              id: `e_${dragNode.id}_${n.id}`,
              source: dragNode.id,
              target: n.id,
            }])
          }
          setSnapGroups((prev) => {
            const next = new Map(prev)
            next.set(dragNode.id, n.id)
            next.set(n.id, dragNode.id)
            return next
          })
          return
        }
      }
    }
  }, [magnetEnabled, setEdges, setNodes, isSingleOutput, isSingleInput])

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

    if (!autoConnectEnabled && !edgeInsertEnabled) {
      setGhostEdges([])
      return
    }

    const clientX = e.clientX
    const clientY = e.clientY

    // Throttle: skip if cursor barely moved
    if (lastDragPosRef.current) {
      const ddx = Math.abs(clientX - lastDragPosRef.current.x)
      const ddy = Math.abs(clientY - lastDragPosRef.current.y)
      if (ddx < 4 && ddy < 4) return
    }
    lastDragPosRef.current = { x: clientX, y: clientY }

    const bounds = wrapperRef.current?.getBoundingClientRect()
    if (!bounds) return

    // Cursor position relative to wrapper (for SVG rendering)
    const cursorWX = clientX - bounds.left
    const cursorWY = clientY - bounds.top

    // Flow position of cursor (for proximity checks)
    const flowPos = reactFlowInstance.screenToFlowPosition({ x: cursorWX, y: cursorWY })

    // Helper: flow coords → wrapper-relative screen coords
    const viewport = reactFlowInstance.getViewport()
    const flowToWrapper = (fx: number, fy: number) => ({
      x: fx * viewport.zoom + viewport.x,
      y: fy * viewport.zoom + viewport.y,
    })

    const currentNodes = nodesRef.current
    const dragCx = flowPos.x + NODE_HALF_W
    const dragCy = flowPos.y + NODE_HALF_H

    // 1. Check edge insertion first (higher priority)
    if (edgeInsertEnabled) {
      const hitEdge = findEdgeAtPosition(flowPos)
      if (hitEdge) {
        const srcNode = currentNodes.find((n) => n.id === hitEdge.source)
        const tgtNode = currentNodes.find((n) => n.id === hitEdge.target)
        if (srcNode && tgtNode) {
          const srcPt = flowToWrapper(srcNode.position.x + NODE_HALF_W, srcNode.position.y + NODE_HALF_H * 2)
          const tgtPt = flowToWrapper(tgtNode.position.x + NODE_HALF_W, tgtNode.position.y)
          setGhostEdges([
            { from: srcPt, to: { x: cursorWX, y: cursorWY }, type: 'insert' },
            { from: { x: cursorWX, y: cursorWY }, to: tgtPt, type: 'insert' },
          ])
          return
        }
      }
    }

    // 2. Check auto-connect proximity
    if (autoConnectEnabled) {
      let bestNode: Node | null = null
      let bestDist = Infinity
      let bestDir: 'above' | 'below' = 'below'

      for (const n of currentNodes) {
        const ncx = n.position.x + NODE_HALF_W
        const ncy = n.position.y + NODE_HALF_H
        const dx = Math.abs(dragCx - ncx)
        const dy = Math.abs(dragCy - ncy)

        if (dx > CONNECT_THRESHOLD * 1.5) continue
        if (dy < 30 || dy > 150) continue

        const dist = Math.hypot(dx, dy)
        if (dist < bestDist) {
          bestDist = dist
          bestNode = n
          bestDir = ncy < dragCy ? 'above' : 'below'
        }
      }

      if (bestNode && bestDist < 150) {
        const bcx = bestNode.position.x + NODE_HALF_W
        const bcy = bestNode.position.y + NODE_HALF_H

        if (bestDir === 'above') {
          const fromPt = flowToWrapper(bcx, bcy + NODE_HALF_H)
          setGhostEdges([{ from: fromPt, to: { x: cursorWX, y: cursorWY }, type: 'connect' }])
        } else {
          const toPt = flowToWrapper(bcx, bcy - NODE_HALF_H)
          setGhostEdges([{ from: { x: cursorWX, y: cursorWY }, to: toPt, type: 'connect' }])
        }
        return
      }
    }

    setGhostEdges([])
  }, [autoConnectEnabled, edgeInsertEnabled, reactFlowInstance, findEdgeAtPosition])

  const onDragLeave = useCallback(() => {
    setGhostEdges([])
    lastDragPosRef.current = null
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setGhostEdges([])
      lastDragPosRef.current = null

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

      // Check if dropped on an edge → auto-insert
      if (edgeInsertEnabled) {
        const hitEdge = findEdgeAtPosition(position)
        if (hitEdge) {
          setNodes((nds) => [...nds, newNode])
          setEdges((eds) => {
            const filtered = eds.filter((e) => e.id !== hitEdge.id)
            return [
              ...filtered,
              {
                id: `e_${hitEdge.source}_${newNode.id}`,
                source: hitEdge.source,
                target: newNode.id,
                sourceHandle: hitEdge.sourceHandle,
              } as Edge,
              {
                id: `e_${newNode.id}_${hitEdge.target}`,
                source: newNode.id,
                target: hitEdge.target,
                targetHandle: hitEdge.targetHandle,
              } as Edge,
            ]
          })
          return
        }
      }

      setNodes((nds) => [...nds, newNode])

      // Auto-connect: find nearest node to the drop position
      if (autoConnectEnabled) {
        const currentNodes = nodesRef.current
        const currentEdges = edgesRef.current
        const dragCx = position.x + NODE_HALF_W
        const dragCy = position.y + NODE_HALF_H

        let bestNode: Node | null = null
        let bestDist = Infinity
        let bestDir: 'above' | 'below' = 'below'

        for (const n of currentNodes) {
          const ncx = n.position.x + NODE_HALF_W
          const ncy = n.position.y + NODE_HALF_H
          const dx = Math.abs(dragCx - ncx)
          const dy = Math.abs(dragCy - ncy)

          if (dx > CONNECT_THRESHOLD * 1.5) continue
          if (dy < 30 || dy > 150) continue

          const dist = Math.hypot(dx, dy)
          if (dist < bestDist) {
            bestDist = dist
            bestNode = n
            bestDir = ncy < dragCy ? 'above' : 'below'
          }
        }

        if (bestNode && bestDist < 150) {
          const sourceId = bestDir === 'above' ? bestNode.id : newNode.id
          const targetId = bestDir === 'above' ? newNode.id : bestNode.id

          const exists = currentEdges.some((e) => e.source === sourceId && e.target === targetId)
          if (!exists && !wouldCreateCycle(sourceId, targetId, null, currentEdges, currentNodes)) {
            setEdges((eds) => [...eds, {
              id: `e_${sourceId}_${targetId}`,
              source: sourceId,
              target: targetId,
            }])
          }
        }
      }
    },
    [reactFlowInstance, pushSnapshot, setNodes, setEdges, findEdgeAtPosition, autoConnectEnabled, edgeInsertEnabled],
  )

  // ---- Context menus ----
  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node) => {
      e.preventDefault()
      e.stopPropagation()

      const nodeType = (node.data as any).nodeType as string
      const quickAddTypes = QUICK_ADD_MAP[nodeType] || ALL_NODE_TYPES

      const isSnapped = snapGroups.has(node.id)

      const items: MenuEntry[] = [
        ...(isSnapped ? [{
          label: t('ctx.unsnap' as any),
          onClick: () => {
            const partnerId = snapGroups.get(node.id)
            setSnapGroups((prev) => {
              const next = new Map(prev)
              next.delete(node.id)
              if (partnerId) next.delete(partnerId)
              return next
            })
          },
        }, { separator: true } as MenuEntry] : []),
        { label: t('ctx.copy'), shortcut: 'Ctrl+C', onClick: () => { setSelectedNode(node); copySelected() } },
        { label: t('ctx.cut'), shortcut: 'Ctrl+X', onClick: () => { setSelectedNode(node); cutSelected() } },
        { label: t('ctx.delete'), shortcut: 'Del', onClick: () => {
          pushSnapshot()
          // Also unsnap partner
          const partnerId = snapGroups.get(node.id)
          if (partnerId) {
            setSnapGroups((prev) => {
              const next = new Map(prev)
              next.delete(node.id)
              next.delete(partnerId)
              return next
            })
          }
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

  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.preventDefault()
      e.stopPropagation()

      const items: MenuEntry[] = [
        {
          label: t('ctx.delete'), shortcut: 'Del', onClick: () => {
            pushSnapshot()
            setEdges((eds) => eds.filter((ed) => ed.id !== edge.id))
          },
        },
      ]

      setCtxMenu({ x: e.clientX, y: e.clientY, items })
    },
    [t, pushSnapshot, setEdges],
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
        const nt = (n.data as Record<string, any>).nodeType || 'mouse_action'
        return {
          id: n.id,
          type: nt,
          position: n.position,
          data: n.data,
        }
      })
      await api.update(id, {
        name,
        description,
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
          <input className="editor-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('editor.namePlaceholder')} />
          <input className="editor-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('editor.descPlaceholder')} />
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
          <div className="palette-toggles">
            <button
              className={`palette-toggle ${autoConnectEnabled ? 'active' : ''}`}
              onClick={() => setAutoConnectEnabled((v) => !v)}
              title={t('editor.autoConnect' as any)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M9 6h6a3 3 0 0 1 3 3v6" />
              </svg>
            </button>
            <button
              className={`palette-toggle ${edgeInsertEnabled ? 'active' : ''}`}
              onClick={() => setEdgeInsertEnabled((v) => !v)}
              title={t('editor.edgeInsert' as any)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </button>
            <button
              className={`palette-toggle ${magnetEnabled ? 'active' : ''}`}
              onClick={() => setMagnetEnabled((v) => !v)}
              title={t('editor.magnet' as any)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 8V4h4v4a4 4 0 0 0 8 0V4h4v4a8 8 0 0 1-16 0z" />
              </svg>
            </button>
          </div>
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
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 } }}
          fitView
          /* Selection: left-click drag = box select */
          selectionOnDrag={!spaceHeld}
          selectionMode={SelectionMode.Partial}
          /* Pan: space+left-drag or middle-mouse drag */
          panOnDrag={spaceHeld ? true : [1]}
          panOnScroll={false}
          /* Zoom: scroll wheel */
          zoomOnScroll={true}
          /* Allow selecting edges by clicking */
          edgesFocusable={true}
          edgesReconnectable={true}
          /* Disable default delete key (we handle it ourselves) */
          deleteKeyCode={null}
          multiSelectionKeyCode="Control"
        >
          <Controls />
          <Background />
        </ReactFlow>

        {/* Ghost edge preview during palette drag (wrapper-relative screen coords) */}
        {ghostEdges.length > 0 && (
          <svg className="ghost-edge-layer">
            <defs>
              <marker id="ghost-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={ghostEdges[0].type === 'insert' ? '#e76f51' : 'var(--primary)'} fillOpacity="0.6" />
              </marker>
            </defs>
            {ghostEdges.map((ge, i) => (
              <line
                key={i}
                x1={ge.from.x} y1={ge.from.y}
                x2={ge.to.x} y2={ge.to.y}
                stroke={ge.type === 'insert' ? '#e76f51' : 'var(--primary)'}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.6}
                markerEnd="url(#ghost-arrow)"
              />
            ))}
          </svg>
        )}

        {ctxMenu && (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={ctxMenu.items}
            onClose={() => setCtxMenu(null)}
          />
        )}

        {selectedNode && (() => {
          const partnerId = snapGroups.get(selectedNode.id)
          const partnerNode = partnerId ? nodes.find((n) => n.id === partnerId) : null
          // Order: top node first (smaller y)
          const topNode = partnerNode && partnerNode.position.y < selectedNode.position.y ? partnerNode : selectedNode
          const bottomNode = partnerNode && partnerNode.position.y < selectedNode.position.y ? selectedNode : partnerNode

          return (
            <div className="node-config-panel">
              <NodeConfigPanel
                node={topNode}
                nodes={nodes}
                edges={edges}
                onChange={handleNodeDataChange}
                onClose={() => setSelectedNode(null)}
                onDelete={handleDeleteNode}
                embedded
              />
              {bottomNode && (
                <>
                  <div className="config-snap-divider" />
                  <NodeConfigPanel
                    node={bottomNode}
                    nodes={nodes}
                    edges={edges}
                    onChange={handleNodeDataChange}
                    onClose={() => setSelectedNode(null)}
                    onDelete={handleDeleteNode}
                    embedded
                  />
                </>
              )}
            </div>
          )
        })()}
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
