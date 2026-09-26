/** "v1.1.0 · 72150ab": the app version and the commit it was built from. */
export function versionLabel(version: string, commit: string): string {
  return commit ? `v${version} · ${commit}` : `v${version}`
}

export function AppVersion({ className = 'app-version' }: { className?: string }) {
  return (
    <p className={className} data-testid="app-version">
      {versionLabel(__APP_VERSION__, __APP_COMMIT__)}
    </p>
  )
}
