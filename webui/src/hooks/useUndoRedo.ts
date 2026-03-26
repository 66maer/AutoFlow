import { useCallback, useRef } from 'react'
import type { Node, Edge } from '@xyflow/react'

interface Snapshot {
  nodes: Node[]
  edges: Edge[]
}

const MAX_HISTORY = 50

export default function useUndoRedo(
  setNodes: (updater: Node[] | ((nds: Node[]) => Node[])) => void,
  setEdges: (updater: Edge[] | ((eds: Edge[]) => Edge[])) => void,
) {
  const past = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])
  const current = useRef<Snapshot>({ nodes: [], edges: [] })
  const paused = useRef(false)

  /** Call after initial load or whenever you want to reset history */
  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    current.current = { nodes: structuredClone(nodes), edges: structuredClone(edges) }
  }, [])

  /** Call before every user mutation to push current state onto undo stack */
  const pushSnapshot = useCallback(() => {
    if (paused.current) return
    past.current = [...past.current.slice(-(MAX_HISTORY - 1)), structuredClone(current.current)]
    future.current = []
  }, [])

  /** Update current ref (call from onNodesChange / onEdgesChange) */
  const updateCurrent = useCallback((nodes: Node[], edges: Edge[]) => {
    current.current = { nodes, edges }
  }, [])

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(structuredClone(current.current))
    current.current = prev
    paused.current = true
    setNodes(prev.nodes)
    setEdges(prev.edges)
    paused.current = false
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(structuredClone(current.current))
    current.current = next
    paused.current = true
    setNodes(next.nodes)
    setEdges(next.edges)
    paused.current = false
  }, [setNodes, setEdges])

  const canUndo = useCallback(() => past.current.length > 0, [])
  const canRedo = useCallback(() => future.current.length > 0, [])

  return { takeSnapshot, pushSnapshot, updateCurrent, undo, redo, canUndo, canRedo }
}
