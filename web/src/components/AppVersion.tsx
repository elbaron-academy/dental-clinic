import { versionLabel } from '../lib/version'

/** The app version and build commit, set in vite.config.ts. */
export function AppVersion({ className = 'app-version' }: { className?: string }) {
  return (
    <p className={className} data-testid="app-version">
      {versionLabel(__APP_VERSION__, __APP_COMMIT__)}
    </p>
  )
}
