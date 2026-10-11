import { API_URL } from '../config/api'
import { sessionBridge } from './session'

export class ApiError extends Error {
  status: number
  code: string
  details?: { path: string; message: string }[]

  constructor(status: number, code: string, message: string, details?: { path: string; message: string }[]) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

async function readJson(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as { ok?: boolean; data?: unknown; meta?: unknown; error?: { code?: string; message?: string; details?: { path: string; message: string }[] } }
  } catch {
    return null
  }
}

let refreshPromise: Promise<boolean> | null = null

export function refreshSession(): Promise<boolean> {
  if (!sessionBridge.refreshToken) return Promise.resolve(false)
  if (refreshPromise) return refreshPromise
  const current = sessionBridge.refreshToken
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current }),
      })
      const body = await readJson(response)
      if (!response.ok || !body?.ok || !body.data) return false
      const data = body.data as { accessToken: string; refreshToken: string }
      await sessionBridge.persist(data.accessToken, data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

export async function api<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<{ data: T; meta?: { page: number; pageSize: number; total: number } }> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (sessionBridge.accessToken) headers.set('Authorization', `Bearer ${sessionBridge.accessToken}`)
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'NETWORK', 'The server could not be reached. You can keep using what is stored on this device.')
  }
  if (response.status === 401 && allowRefresh && sessionBridge.refreshToken && path !== '/api/auth/refresh') {
    const refreshed = await refreshSession()
    if (refreshed) return api<T>(path, options, false)
  }
  const body = await readJson(response)
  if (!response.ok || !body?.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST',
      body?.error?.message ?? 'That request could not be completed.',
      body?.error?.details,
    )
  }
  return { data: body.data as T, meta: body.meta as { page: number; pageSize: number; total: number } | undefined }
}
