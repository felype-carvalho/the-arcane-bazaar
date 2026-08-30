import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from './App'

function LocationDisplay() {
  const location = useLocation()
  return <output aria-label="Current path">{location.pathname}</output>
}

function renderApp(initialEntries = ['/catalog']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
      <LocationDisplay />
    </MemoryRouter>,
  )
}

vi.mock('./services/catalog', async () => {
  const { ITEM_FIXTURES } = await import('./test/fixtures/items')
  const filler = Array.from({ length: 18 }, (_, index) => ({
    ...ITEM_FIXTURES[1],
    id: `test-relic-${index + 1}`,
    name: `Test Relic ${index + 1}`,
    tags: [...ITEM_FIXTURES[1].tags],
    properties: [...ITEM_FIXTURES[1].properties],
  }))
  const commonItem = {
    ...ITEM_FIXTURES[1],
    id: 'common-rope',
    name: 'Hempen Rope',
    type: 'Common' as const,
    rarity: 'None' as const,
    tags: [...ITEM_FIXTURES[1].tags],
    properties: [...ITEM_FIXTURES[1].properties],
  }
  const catalog = [commonItem, ...ITEM_FIXTURES, ...filler]
  return { getItems: () => Promise.resolve(catalog.map((item) => ({ ...item, tags: [...item.tags], properties: [...item.properties] }))) }
})

describe('Arcane Bazaar app', () => {
  it('redirects the root route to the catalog', async () => {
    renderApp(['/'])

    expect(await screen.findByLabelText('Current path')).toHaveTextContent('/catalog')
    expect(screen.getByRole('heading', { name: 'The Arcane Bazaar' })).toBeInTheDocument()
  })

  it('renders the catalog directly at its canonical route', async () => {
    renderApp()

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/catalog')
  })

  it('renders the desktop catalog with separate item type and category columns', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('radio', { name: 'Magic' }))

    const table = await screen.findByRole('table')
    const row = within(table).getByRole('row', { name: /Bag of Holding/i })
    const cells = within(row).getAllByRole('cell')

    expect(within(table).getByRole('columnheader', { name: 'Item type' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
    expect(within(cells[0]).getByText('Bag of Holding')).toBeInTheDocument()
    expect(within(cells[0]).getByTitle("Source: DMG'14")).toHaveTextContent(/^DMG'14$/)
    expect(within(cells[0]).getByTitle("Source: DMG'14")).toHaveClass('source-chip')
    expect(cells[0].querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
    expect(cells[1]).toHaveTextContent('Magic')
    expect(cells[1]).not.toHaveTextContent('Bag/Container')
    expect(cells[2]).toHaveTextContent('Bag/Container')
    expect(within(cells[2]).queryByText('Container')).not.toBeInTheDocument()
  })

  it('starts item type expanded, keeps the other filter groups collapsed, and lists categories in the configured order', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.queryByText(/\d+ of \d+ items/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Search items')).toHaveClass('search-field')

    const expectedCategories = [
      'Adventuring Gear', 'Ammunition', 'Amulet', 'Apparel', 'Armor', 'Bag/Container',
      'Clockwork', 'Consumable', 'Explosive', 'Food and Drink', 'Gem', 'Instrument', 'Mount',
      'Other', 'Poison', 'Potion', 'Ring', 'Scroll', 'Service', 'Spellcasting Focus',
      'Staff / Rod', 'Summonable', 'Tattoo', 'Tome', 'Tool', 'Trade Good', 'Vehicle', 'Weapon',
    ]
    const toggles = [
      'Item type', 'Rarity', 'Category',
      // 'Availability',
    ].map((name) => screen.getByRole('button', { name }))
    expect(toggles.map((toggle) => toggle.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false'])

    await user.click(screen.getByRole('button', { name: 'Category' }))
    expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'true')

    const categoryFilter = screen.getByRole('group', { name: 'Category' })
    const categoryNames = within(categoryFilter).getAllByRole('checkbox').map((checkbox) => checkbox.parentElement?.querySelector('span:last-child')?.textContent)

    expect(categoryNames).toEqual(expectedCategories)
    expect(new Set(categoryNames).size).toBe(expectedCategories.length)
  })

  it('allows only one item type to be selected at a time', async () => {
    const user = userEvent.setup()
    renderApp()

    const itemTypeFilter = screen.getByRole('group', { name: 'Item type' })
    const radios = within(itemTypeFilter).getAllByRole('radio')
    const [common, magic] = radios

    expect(radios.map((radio) => radio.parentElement?.textContent)).toEqual(['Common', 'Magic'])

    expect(magic).not.toBeChecked()
    expect(common).toBeChecked()

    await user.click(magic)
    expect(magic).toBeChecked()
    expect(common).not.toBeChecked()

    await user.click(common)
    expect(magic).not.toBeChecked()
    expect(common).toBeChecked()
  })

  it('loads the catalog and shows an empty state for an unmatched search', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('radio', { name: 'Magic' }))
    expect((await screen.findAllByText('Bag of Holding')).length).toBeGreaterThan(0)
    await user.type(screen.getAllByLabelText('Search items')[0], 'something not in the bazaar')
    expect(await screen.findByText('No items found')).toBeInTheDocument()
  })

  it('opens the complete item sheet and closes it with Escape', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('radio', { name: 'Magic' }))
    const button = await screen.findByRole('button', { name: /view full item sheet/i })
    await user.click(button)
    const dialog = screen.getByRole('dialog', { name: 'Bag of Holding' })
    expect(within(dialog).getByText('Complete item sheet')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('paginates the catalog and selects an item from the next page', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('radio', { name: 'Magic' }))
    const next = await screen.findByRole('button', { name: 'Next page' })
    expect(next).toBeEnabled()
    await user.click(next)
    const row = await screen.findByRole('row', { name: /Vicious Longsword/i })
    await user.click(row)
    expect((await screen.findAllByText('Vicious Longsword')).length).toBeGreaterThan(0)
  })

  it('adds and removes a custom percentage modifier', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('radio', { name: 'Magic' }))
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
