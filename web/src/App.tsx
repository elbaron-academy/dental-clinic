import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { HomeRedirect, RequireAuth, RequirePermission, RequireRole } from './auth/guards'
import { Layout } from './components/Layout'
import { AppointmentDetail } from './pages/appointments/AppointmentDetail'
import { AppointmentForm } from './pages/appointments/AppointmentForm'
import { AppointmentsPage } from './pages/appointments/AppointmentsPage'
import { Dashboard } from './pages/Dashboard'
import { LoginChooser } from './pages/LoginChooser'
import { LoginPage } from './pages/LoginPage'
import { NotFound } from './pages/NotFound'
import { PatientDetail } from './pages/patients/PatientDetail'
import { PatientFormPage } from './pages/patients/PatientForm'
import { PatientList } from './pages/patients/PatientList'
import { VisitPage } from './pages/visits/VisitPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginChooser />} />
      <Route path="/login/:role" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          path="/doctor"
          element={
            <RequireRole role="DOCTOR">
              <Dashboard role="DOCTOR" />
            </RequireRole>
          }
        />
        <Route
          path="/assistant"
          element={
            <RequireRole role="ASSISTANT">
              <Dashboard role="ASSISTANT" />
            </RequireRole>
          }
        />
        <Route
          path="/reception"
          element={
            <RequireRole role="RECEPTIONIST">
              <Dashboard role="RECEPTIONIST" />
            </RequireRole>
          }
        />
        <Route
          path="/patients"
          element={
            <RequirePermission perms={['patients.view_patient']}>
              <PatientList />
            </RequirePermission>
          }
        />
        <Route
          path="/patients/new"
          element={
            <RequirePermission perms={['patients.add_patient']}>
              <PatientFormPage />
            </RequirePermission>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <RequirePermission perms={['patients.view_patient']}>
              <PatientDetail />
            </RequirePermission>
          }
        />
        <Route
          path="/patients/:id/edit"
          element={
            <RequirePermission perms={['patients.change_patient']}>
              <PatientFormPage />
            </RequirePermission>
          }
        />
        <Route
          path="/appointments"
          element={
            <RequirePermission perms={['appointments.view_appointment']}>
              <AppointmentsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/appointments/new"
          element={
            <RequirePermission perms={['appointments.add_appointment']}>
              <AppointmentForm />
            </RequirePermission>
          }
        />
        <Route
          path="/appointments/:id"
          element={
            <RequirePermission perms={['appointments.view_appointment']}>
              <AppointmentDetail />
            </RequirePermission>
          }
        />
        <Route
          path="/visits/:id"
          element={
            <RequirePermission perms={['visits.view_visit']}>
              <VisitPage />
            </RequirePermission>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
