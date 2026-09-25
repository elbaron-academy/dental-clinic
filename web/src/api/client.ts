// Minimal fetch wrapper for the Dental Clinic API.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export type FieldErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fieldErrors: FieldErrors

  constructor(status: number, message: string, code?: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }

  /** First error message for a form field, if the API reported one. */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0]
  }
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

/** Called when an authenticated request gets 401 (token revoked or user deactivated). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Query
  signal?: AbortSignal
}

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${BASE_URL}/api${path}${qs ? `?${qs}` : ''}`
}

function toFieldErrors(data: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail' || key === 'code') continue
    if (Array.isArray(value)) errors[key] = value.map(String)
    else if (typeof value === 'string') errors[key] = [value]
  }
  return errors
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Token ${authToken}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.', 'network_error')
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (response.ok) return data as T

  if (response.status === 401 && authToken && onUnauthorized) onUnauthorized()

  const body = (data && typeof data === 'object' && !Array.isArray(data) ? data : {}) as Record<string, unknown>
  const fieldErrors = toFieldErrors(body)
  const detail =
    typeof body.detail === 'string'
      ? body.detail
      : fieldErrors.non_field_errors?.[0] ??
        (Object.keys(fieldErrors).length ? 'Please correct the highlighted fields.' : defaultMessage(response.status))
  const code = typeof body.code === 'string' ? body.code : undefined
  throw new ApiError(response.status, detail, code, fieldErrors)
}

function defaultMessage(status: number): string {
  if (status === 403) return 'You do not have permission to do this.'
  if (status === 404) return 'Not found.'
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.'
  if (status >= 500) return 'The server had a problem. Please try again.'
  return `Request failed (${status}).`
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
