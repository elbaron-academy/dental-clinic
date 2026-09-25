import { useEffect, useState } from 'react'

/** The app shell works offline, but clinical data needs the server. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  if (online) return null
  return (
    <div className="offline-banner" role="status">
      You are offline. Changes cannot be saved until the connection returns.
    </div>
  )
}
