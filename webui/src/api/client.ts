import type { ExecutionLog, Workflow } from './types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status}: ${body}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Workflows
export const workflows = {
  list: () => request<Workflow[]>('/workflows'),
  get: (id: string) => request<Workflow>(`/workflows/${id}`),
  create: (data: Partial<Workflow>) =>
    request<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Workflow>) =>
    request<Workflow>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/workflows/${id}`, { method: 'DELETE' }),
  run: (id: string) =>
    request<{ status: string }>(`/workflows/${id}/run`, { method: 'POST' }),
  stop: (id: string) =>
    request<{ status: string }>(`/workflows/${id}/stop`, { method: 'POST' }),
}

// Logs
export const logs = {
  list: (params?: { workflow_id?: string; status?: string; limit?: number }) => {
    const query = new URLSearchParams()
    if (params?.workflow_id) query.set('workflow_id', params.workflow_id)
    if (params?.status) query.set('status', params.status)
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return request<ExecutionLog[]>(`/logs${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => request<ExecutionLog>(`/logs/${id}`),
}

// WebSocket
export function connectLogStream(
  onMessage: (data: unknown) => void,
): WebSocket {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${proto}//${location.host}/ws/logs`)
  ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  return ws
}
