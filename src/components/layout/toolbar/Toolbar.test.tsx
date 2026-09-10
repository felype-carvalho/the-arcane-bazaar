import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  it('opens and closes the empty settings modal', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    const menuButton = screen.getByRole('button', { name: 'Open system menu' })
    await user.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('menuitem', { name: 'Settings' }))

    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(dialog).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close settings' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the version and GitHub repository in the information modal', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Open system menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'About' }))
    const dialog = screen.getByRole('dialog', { name: 'About The Arcane Bazaar' })

    expect(within(dialog).getByText('1.1.0')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /View repository/ })).toHaveAttribute('href', 'https://github.com/felype-carvalho/the-arcane-bazaar')
  })
})
