/** "v1.1.0 · 72150ab": the app version and the commit it was built from. */
export function versionLabel(version: string, commit: string): string {
  return commit ? `v${version} · ${commit}` : `v${version}`
}
