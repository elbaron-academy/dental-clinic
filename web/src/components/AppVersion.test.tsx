import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppVersion, versionLabel } from './AppVersion'

describe('AppVersion', () => {
  it('shows the package version from the build', () => {
    render(<AppVersion />)
    expect(screen.getByTestId('app-version')).toHaveTextContent(/^v\d+\.\d+\.\d+/)
    expect(screen.getByTestId('app-version')).toHaveTextContent(`v${__APP_VERSION__}`)
  })

  it('adds the commit when the build has one', () => {
    expect(versionLabel('1.1.0', '72150ab')).toBe('v1.1.0 · 72150ab')
    expect(versionLabel('1.1.0', '')).toBe('v1.1.0')
  })
})
