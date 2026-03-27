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

// Templates
export const templates = {
  upload: async (file: File | Blob, filename?: string): Promise<{ id: string; filename: string }> => {
    const form = new FormData()
    form.append('file', file, filename || 'paste.png')
    const res = await fetch(`${BASE}/templates/upload`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    return res.json()
  },
  previewUrl: (templateId: string) => `${BASE}/templates/${templateId}/preview`,
  delete: (templateId: string) => request<{ ok: boolean }>(`/templates/${templateId}`, { method: 'DELETE' }),
}

// Screen tools
export const screen = {
  pickCoord: (mode: 'free' | 'window' = 'free') =>
    request<{ x: number | null; y: number | null; window_title: string | null; window_hwnd: number | null; cancelled: boolean }>(
      '/screen/pick-coord',
      { method: 'POST', body: JSON.stringify({ mode }) },
    ),
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
