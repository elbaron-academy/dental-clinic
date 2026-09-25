import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeUser, renderWithAuth } from '../test/utils'
import { HomeRedirect, RequireAuth, RequirePermission, RequireRole } from './guards'

describe('route guards (AUTH-002)', () => {
  it('sends anonymous users to the login chooser', () => {
    renderWithAuth(
      <RequireAuth>
        <p>Secret</p>
      </RequireAuth>,
      { user: null, path: '/patients', route: '/patients' },
    )
    expect(screen.getByText('Login chooser')).toBeInTheDocument()
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })

  it('keeps each role on its own home', () => {
    renderWithAuth(
      <RequireRole role="DOCTOR">
        <p>Doctor dashboard</p>
      </RequireRole>,
      { path: '/doctor-only', route: '/doctor-only' },
    )
    expect(screen.getByText('Reception home')).toBeInTheDocument()
  })

  it('redirects / to the role home', () => {
    const doctor = makeUser({ role: 'DOCTOR', role_display: 'Doctor' })
    renderWithAuth(<HomeRedirect />, { user: doctor, path: '/', route: '/' })
    expect(screen.getByText('Doctor home')).toBeInTheDocument()
  })

  it('hides pages the user lacks permission for', () => {
    const assistant = makeUser({ role: 'ASSISTANT', permissions: ['patients.view_patient'] })
    renderWithAuth(
      <RequirePermission perms={['patients.add_patient']}>
        <p>Register form</p>
      </RequirePermission>,
      { user: assistant },
    )
    expect(screen.getByText('Not available')).toBeInTheDocument()
    expect(screen.queryByText('Register form')).not.toBeInTheDocument()
  })
})
