import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Arcane Bazaar app', () => {
  it('loads the catalog and shows an empty state for an unmatched search', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect((await screen.findAllByText('Bag of Holding')).length).toBeGreaterThan(0)
    await user.type(screen.getAllByLabelText('Search items')[0], 'something not in the bazaar')
    expect(await screen.findByText('No items found')).toBeInTheDocument()
  })

  it('opens the complete item sheet and closes it with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = await screen.findByRole('button', { name: /view full item sheet/i })
    await user.click(button)
    const dialog = screen.getByRole('dialog', { name: 'Bag of Holding' })
    expect(within(dialog).getByText('Complete item sheet')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('adds and removes a custom percentage modifier', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect((await screen.findAllByText('Bag of Holding')).length).toBeGreaterThan(0)
    await user.type(screen.getByLabelText('Modifier name'), 'Festival tax')
    await user.type(screen.getByLabelText('Modifier percent'), '10')
    await user.click(screen.getByRole('button', { name: 'Add custom modifier' }))
    expect(screen.getAllByText(/Festival tax/).length).toBeGreaterThan(0)
    expect(screen.getByText('4,400 GP')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Festival tax' }))
    expect(screen.queryByText(/Festival tax/)).not.toBeInTheDocument()
  })
})
