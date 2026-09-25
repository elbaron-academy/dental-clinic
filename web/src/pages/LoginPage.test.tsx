import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { makeUser, mockApi } from '../test/utils'
import { LoginPage } from './LoginPage'

function renderLogin(path: string) {
  setAuthToken(null)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login/:role" element={<LoginPage />} />
          <Route path="/login" element={<p>Login chooser</p>} />
          <Route path="/doctor" element={<p>Doctor home</p>} />
          <Route path="/reception" element={<p>Reception home</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => setAuthToken(null))

describe('role login pages (AUTH-001, S02-PWA-01..03)', () => {
  it.each([
    ['/login/doctor', 'Doctor sign in'],
    ['/login/assistant', 'Assistant sign in'],
    ['/login/reception', 'Receptionist sign in'],
  ])('%s shows its own heading', (path, heading) => {
    mockApi({})
    renderLogin(path)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByLabelText(/Phone number/)).toHaveAttribute('type', 'tel')
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument()
  })

  it('logs in with phone + password + role and opens the role home', async () => {
    const doctor = makeUser({ role: 'DOCTOR', role_display: 'Doctor', full_name: 'Dr. Amal' })
    const { calls } = mockApi({
      'POST /api/auth/login/': () => ({ body: { token: 'tok', user: doctor } }),
    })
    renderLogin('/login/doctor')
    await userEvent.type(screen.getByLabelText(/Phone number/), '01000000001')
    await userEvent.type(screen.getByLabelText(/Password/), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Doctor home')).toBeInTheDocument()
    expect(calls[0].body).toEqual({ phone: '01000000001', password: 'secret-pass', role: 'DOCTOR' })
    expect(localStorage.getItem('dental-clinic.token')).toBe('tok')
  })

  it('shows the server message when the account belongs to another portal', async () => {
    mockApi({
      'POST /api/auth/login/': () => ({
        status: 400,
        body: {
          detail: 'This is a Receptionist account. Please use the Receptionist login page.',
          code: 'role_mismatch',
        },
      }),
    })
    renderLogin('/login/doctor')
    await userEvent.type(screen.getByLabelText(/Phone number/), '01000000004')
    await userEvent.type(screen.getByLabelText(/Password/), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Receptionist login page')
    expect(localStorage.getItem('dental-clinic.token')).toBeNull()
  })

  it('shows invalid credentials', async () => {
    mockApi({
      'POST /api/auth/login/': () => ({
        status: 400,
        body: { detail: 'Invalid phone number or password.', code: 'invalid_credentials' },
      }),
    })
    renderLogin('/login/reception')
    await userEvent.type(screen.getByLabelText(/Phone number/), '0100')
    await userEvent.type(screen.getByLabelText(/Password/), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid phone number or password.')
  })

  it('unknown portals go back to the chooser', () => {
    mockApi({})
    renderLogin('/login/admin')
    expect(screen.getByText('Login chooser')).toBeInTheDocument()
  })
})
