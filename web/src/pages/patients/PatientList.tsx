import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/endpoints'
import { useAuth, useUser } from '../../auth/context'
import { Card, EmptyState, ErrorAlert, Loading, PageHeader } from '../../components/ui'
import { useAsync } from '../../lib/useAsync'

/** Patient listing and search within the user's scope (PATIENT-004, PATIENT-005). */
export function PatientList() {
  const user = useUser()
  const { hasPerm } = useAuth()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [doctor, setDoctor] = useState<number | ''>('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(query.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(id)
  }, [query])

  const patients = useAsync(
    () => api.listPatients({ search, doctor: doctor === '' ? undefined : doctor, page }),
    [search, doctor, page],
  )
  const data = patients.data
  const showDoctors = user.permitted_doctors.length > 1

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={data ? `${data.count} patient${data.count === 1 ? '' : 's'}` : undefined}
        actions={
          hasPerm('patients.add_patient') && (
            <Link to="/patients/new" className="btn btn-primary">
              Register patient
            </Link>
          )
        }
      />
      <Card>
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search by name or phone"
            aria-label="Search patients"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {showDoctors && (
            <select
              aria-label="Filter by doctor"
              value={doctor}
              onChange={(event) => {
                setDoctor(event.target.value ? Number(event.target.value) : '')
                setPage(1)
              }}
            >
              <option value="">All my doctors</option>
              {user.permitted_doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
        <ErrorAlert error={patients.error} onRetry={patients.reload} />
        {patients.loading && !data ? (
          <Loading />
        ) : data && data.results.length === 0 ? (
          <EmptyState>{search ? 'No patients match your search.' : 'No patients registered yet.'}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  {showDoctors && <th>Doctors</th>}
                </tr>
              </thead>
              <tbody>
                {data?.results.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <Link to={`/patients/${patient.id}`} className="strong">
                        {patient.full_name}
                      </Link>
                      {patient.is_minor && <span className="badge badge-info">Minor</span>}
                    </td>
                    <td>{patient.phone}</td>
                    {showDoctors && <td>{patient.doctors.map((d) => d.full_name).join(', ')}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (data.next || data.previous) && (
          <div className="pager">
            <button type="button" className="btn btn-ghost" disabled={!data.previous} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span className="muted">Page {page}</span>
            <button type="button" className="btn btn-ghost" disabled={!data.next} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        )}
      </Card>
    </>
  )
}
