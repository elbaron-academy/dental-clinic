import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest, buildUrl, setAuthToken, setUnauthorizedHandler } from './client'

function respond(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })),
  )
}

function failure(promise: Promise<unknown>): Promise<ApiError> {
  return promise.then(
    () => {
      throw new Error('expected the request to fail')
    },
    (error: ApiError) => error,
  )
}

afterEach(() => {
  setAuthToken(null)
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

describe('apiRequest', () => {
  it('sends the token and JSON body', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    setAuthToken('abc')
    await apiRequest('/patients/', { method: 'POST', body: { full_name: 'A' } })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/patients/')
    expect((init.headers as Record<string, string>).Authorization).toBe('Token abc')
    expect(init.body).toBe('{"full_name":"A"}')
  })

  it('maps field errors from a 400 response', async () => {
    respond(400, { phone: ['Enter a valid phone number.'], guardian_name: ['Required.'] })
    const error = await failure(apiRequest('/patients/'))
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.field('phone')).toBe('Enter a valid phone number.')
    expect(error.message).toBe('Please correct the highlighted fields.')
  })

  it('keeps detail and code of business rule violations', async () => {
    respond(409, { detail: 'This patient is already in an active visit.', code: 'active_visit_exists' })
    const error = await failure(apiRequest('/appointments/1/start-visit/', { method: 'POST' }))
    expect(error.status).toBe(409)
    expect(error.code).toBe('active_visit_exists')
    expect(error.message).toBe('This patient is already in an active visit.')
  })

  it('reports network failures as offline-friendly errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    const error = await failure(apiRequest('/auth/me/'))
    expect(error.status).toBe(0)
    expect(error.code).toBe('network_error')
  })

  it('notifies the auth layer when an authenticated request gets 401', async () => {
    respond(401, { detail: 'Invalid token.', code: 'authentication_failed' })
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    setAuthToken('expired')
    await apiRequest('/auth/me/').catch(() => undefined)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('returns undefined for 204 responses', async () => {
    respond(204)
    await expect(apiRequest('/auth/logout/', { method: 'POST' })).resolves.toBeUndefined()
  })
})

describe('buildUrl', () => {
  it('drops empty query values', () => {
    expect(buildUrl('/appointments/', { status: 'SCHEDULED,CHECKED_IN', doctor: undefined, search: '' })).toBe(
      '/api/appointments/?status=SCHEDULED%2CCHECKED_IN',
    )
  })
})
