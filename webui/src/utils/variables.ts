import type { Node, Edge } from '@xyflow/react'

/** A single variable field that a node produces */
export interface VarField {
  /** Full path like "match1.found" */
  path: string
  /** Variable type */
  type: 'boolean' | 'number' | 'string' | 'image'
  /** Suffix after the save_to name, e.g. "found" */
  suffix: string
  /** Source node ID */
  sourceNodeId: string
  /** Source node type */
  sourceNodeType: string
}

/** What each node type outputs when save_to is set */
const NODE_OUTPUTS: Record<string, { suffix: string; type: VarField['type'] }[]> = {
  find_image: [
    { suffix: 'found', type: 'boolean' },
    { suffix: 'x', type: 'number' },
    { suffix: 'y', type: 'number' },
    { suffix: 'w', type: 'number' },
    { suffix: 'h', type: 'number' },
    { suffix: 'confidence', type: 'number' },
  ],
  capture: [
    { suffix: 'image', type: 'image' },
    { suffix: 'width', type: 'number' },
    { suffix: 'height', type: 'number' },
  ],
  click: [
    { suffix: 'x', type: 'number' },
    { suffix: 'y', type: 'number' },
  ],
  mouse_action: [
    { suffix: 'x', type: 'number' },
    { suffix: 'y', type: 'number' },
  ],
}

/** Operators available for each variable type */
export const OPERATORS_FOR_TYPE: Record<string, { value: string; label: string }[]> = {
  boolean: [
    { value: '==', label: '==' },
    { value: '!=', label: '!=' },
  ],
  number: [
    { value: '==', label: '==' },
    { value: '!=', label: '!=' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
  ],
  string: [
    { value: '==', label: '==' },
    { value: '!=', label: '!=' },
    { value: 'contains', label: 'contains' },
  ],
  image: [
    { value: 'exists', label: 'exists' },
    { value: '!exists', label: '!exists' },
  ],
}

/**
 * Collect all variables available to a node by traversing upstream.
 * Follows edges in reverse (target → source) to find ancestor nodes.
 */
export function getUpstreamVariables(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
): VarField[] {
  // Build reverse adjacency: target → [sources]
  const reverseAdj = new Map<string, string[]>()
  for (const e of edges) {
    if (!reverseAdj.has(e.target)) reverseAdj.set(e.target, [])
    reverseAdj.get(e.target)!.push(e.source)
  }

  // BFS upstream from nodeId
  const visited = new Set<string>()
  const queue = [nodeId]
  const ancestors: Node[] = []

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (visited.has(cur)) continue
    visited.add(cur)
    const node = nodes.find((n) => n.id === cur)
    if (node && cur !== nodeId) ancestors.push(node)
    for (const src of reverseAdj.get(cur) || []) {
      queue.push(src)
    }
  }

  // Collect variables from ancestors that have save_to
  const vars: VarField[] = []
  for (const node of ancestors) {
    const d = node.data as Record<string, any>
    const nodeType = d.nodeType as string
    const saveTo = d.save_to as string
    if (!saveTo) continue

    const outputs = NODE_OUTPUTS[nodeType]
    if (!outputs) continue

    for (const o of outputs) {
      vars.push({
        path: `${saveTo}.${o.suffix}`,
        type: o.type,
        suffix: o.suffix,
        sourceNodeId: node.id,
        sourceNodeType: nodeType,
      })
    }
  }

  return vars
}

/** Get the type of a variable path from a list of available variables */
export function getVarType(path: string, vars: VarField[]): VarField['type'] | null {
  const v = vars.find((f) => f.path === path)
  return v ? v.type : null
}
