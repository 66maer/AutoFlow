export interface Workflow {
  id: string
  name: string
  description: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  enabled: boolean
  repeat_count: number
  repeat_forever: boolean
  created_at: string
  updated_at: string
}

export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
}

export interface ExecutionLog {
  id: string
  workflow_id: string
  status: 'running' | 'success' | 'failed'
  started_at: string
  finished_at: string | null
  detail: Record<string, unknown>
}

export interface MatchItem {
  x: number
  y: number
  w: number
  h: number
  confidence: number
}
