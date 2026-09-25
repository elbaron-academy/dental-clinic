import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '../auth/context'
import { ROLES } from '../auth/roles'
import { InstallButton } from './InstallButton'
import { OfflineBanner } from './OfflineBanner'

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="currentColor" />
      <path
        fill="#fff"
        d="M176 104C128 104 96 144 96 200c0 48 20 76 32 120s16 96 48 96 36-76 80-76 48 76 80 76 36-52 48-96 32-72 32-120c0-56-32-96-80-96-32 0-48 16-80 16s-48-16-80-16Z"
      />
    </svg>
  )
}

export function Layout() {
  const user = useUser()
  const { hasPerm, logout } = useAuth()
  const navigate = useNavigate()
  const role = ROLES[user.role]

  const links = [
    { to: role.home, label: 'Home', show: true },
    { to: '/patients', label: 'Patients', show: hasPerm('patients.view_patient') },
    { to: '/appointments', label: 'Appointments', show: hasPerm('appointments.view_appointment') },
  ].filter((link) => link.show)

  return (
    <div className="app">
      <OfflineBanner />
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to={role.home} className="brand">
            <Logo />
            <span>
              <strong>{user.clinic.name}</strong>
              <small>Dental Clinic</small>
            </span>
          </NavLink>
          <nav className="nav" aria-label="Main">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === role.home}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="user-menu">
            <InstallButton />
            <span className="user-name">
              {user.full_name} <span className="badge badge-role">{user.role_display}</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={async () => {
                await logout()
                navigate(role.login, { replace: true })
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
