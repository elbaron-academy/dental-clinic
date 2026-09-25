import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="card empty-state">
      <h2>Page not found</h2>
      <p>
        <Link to="/">Go to your home page</Link>
      </p>
    </div>
  )
}
