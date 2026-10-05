import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Layout } from './Layout'
import { renderWithAuth } from '../test/utils'

describe('ProductTour', () => {
  it('can start, pause, continue, and skip the tour', async () => {
    const user = userEvent.setup()
    renderWithAuth(<Layout />)

    await user.click(screen.getByRole('button', { name: 'Start tour' }))
    expect(screen.getByRole('heading', { name: 'Clinic workspace' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.queryByRole('heading', { name: 'Clinic workspace' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue tour' }))
    expect(screen.getByText(/Step 1 of \d+/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByRole('button', { name: 'Tour' })).toBeInTheDocument()
  })
})
