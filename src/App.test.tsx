import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Arcane Bazaar app', () => {
  it('renders the desktop catalog without name icons or item subtypes', async () => {
    render(<App />)

    const table = await screen.findByRole('table')
    const row = within(table).getByRole('row', { name: /Bag of Holding/i })
    const cells = within(row).getAllByRole('cell')

    expect(cells[0]).toHaveTextContent(/^Bag of Holding$/)
    expect(cells[0].querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
    expect(cells[1]).toHaveTextContent('Magic')
    expect(cells[1]).toHaveTextContent('Bag/Container')
    expect(within(cells[1]).queryByText('Container')).not.toBeInTheDocument()
  })

  it('starts filter groups collapsed and lists categories in the configured order', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByText(/\d+ of \d+ items/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Search items')).toHaveClass('search-field')

    const expectedCategories = [
      'Adventuring Gear', 'Ammunition', 'Amulet', 'Apparel', 'Armor', 'Bag/Container',
      'Clockwork', 'Consumable', 'Explosive', 'Food and Drink', 'Gem', 'Instrument', 'Mount',
      'Other', 'Poison', 'Potion', 'Ring', 'Scroll', 'Service', 'Spellcasting Focus',
      'Staff / Rod', 'Summonable', 'Tattoo', 'Tome', 'Tool', 'Trade Good', 'Vehicle', 'Weapon',
    ]
    const toggles = ['Item type', 'Rarity', 'Category', 'Availability'].map((name) => screen.getByRole('button', { name }))
    expect(toggles.every((toggle) => toggle.getAttribute('aria-expanded') === 'false')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Category' }))
    expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'true')

    const categoryFilter = screen.getByRole('group', { name: 'Category' })
    const categoryNames = within(categoryFilter).getAllByRole('checkbox').map((checkbox) => checkbox.parentElement?.querySelector('span:last-child')?.textContent)

    expect(categoryNames).toEqual(expectedCategories)
    expect(new Set(categoryNames).size).toBe(expectedCategories.length)
  })

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
