import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { setAuthToken } from '../api/client'
import type { Me } from '../api/types'
import { AuthContext, type AuthContextValue } from '../auth/context'

export function makeUser(overrides: Partial<Me> = {}): Me {
  return {
    id: 1,
    phone: '01000000004',
    full_name: 'Rana Adel',
    role: 'RECEPTIONIST',
    role_display: 'Receptionist',
    clinic: { id: 1, name: 'Smile Dental Center', doctor_count: 1 },
    permissions: [
      'patients.view_patient',
      'patients.add_patient',
      'patients.change_patient',
      'appointments.view_appointment',
      'appointments.add_appointment',
      'appointments.check_in_appointment',
      'visits.start_visit',
      'payments.view_payment',
    ],
    permitted_doctors: [{ id: 10, full_name: 'Dr. Amal Hassan' }],
    ...overrides,
  }
}

export function authValue(user: Me | null, overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: user ? 'authenticated' : 'anonymous',
    user,
    login: vi.fn(),
    logout: vi.fn(),
    hasPerm: (...perms: string[]) => !!user && perms.every((p) => user.permissions.includes(p)),
    sessionExpired: false,
    lastRole: null,
    ...overrides,
  }
}

/** Renders `element` at `path` with a fake auth context. */
export function renderWithAuth(
  element: ReactElement,
  { user = makeUser(), path = '/', route = '*', auth }: { user?: Me | null; path?: string; route?: string; auth?: Partial<AuthContextValue> } = {},
) {
  return render(
    <AuthContext.Provider value={authValue(user, auth)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="/login" element={<p>Login chooser</p>} />
          <Route path="/login/reception" element={<p>Reception login</p>} />
          <Route path="/doctor" element={<p>Doctor home</p>} />
          <Route path="/assistant" element={<p>Assistant home</p>} />
          <Route path="/reception" element={<p>Reception home</p>} />
          <Route path="/patients/:id" element={<p>Patient page</p>} />
          <Route path="/appointments/:id" element={<p>Appointment page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

type Handler = (url: URL, init: RequestInit) => { status?: number; body?: unknown }

/** Replaces fetch with a tiny router: `{ 'POST /api/patients/': handler }`. */
export function mockApi(routes: Record<string, Handler>) {
  setAuthToken('test-token')
  const calls: { method: string; path: string; body: unknown }[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init.method ?? 'GET'
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, path: url.pathname, body })
    const handler = routes[`${method} ${url.pathname}`]
    if (!handler) return new Response(JSON.stringify({ detail: 'Not mocked' }), { status: 404 })
    const { status = 200, body: responseBody } = handler(url, init)
    return new Response(status === 204 ? null : JSON.stringify(responseBody ?? {}), { status })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}
