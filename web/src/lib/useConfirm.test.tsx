import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useConfirm } from './useConfirm'

function Harness() {
  const { confirm, dialog } = useConfirm()
  const [result, setResult] = useState('none')
  return (
    <>
      {dialog}
      <button
        type="button"
        onClick={async () => setResult(String(await confirm({ title: 'Delete it?', message: 'This cannot be undone.', confirmLabel: 'Yes, delete', tone: 'danger' })))}
      >
        Open
      </button>
      <p>Result: {result}</p>
    </>
  )
}

describe('confirm dialog', () => {
  it('resolves true on confirm and closes', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete it?' })
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    expect(screen.getByText('Result: true')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus()
  })

  it('resolves false on Cancel, Escape and a click outside', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Result: false')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(document.querySelector('.modal-backdrop')!)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Result: false')).toBeInTheDocument()
  })

  it('keeps Tab focus inside the dialog', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toHaveFocus()
  })
})
