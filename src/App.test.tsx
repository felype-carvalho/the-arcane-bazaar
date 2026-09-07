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
    category: 'Adventuring Gear' as const,
    tags: [...ITEM_FIXTURES[1].tags],
    properties: [...ITEM_FIXTURES[1].properties],
  }
  const commonWeapon = {
    ...ITEM_FIXTURES[2],
    id: 'common-practice-sword',
    name: 'Practice Sword',
    type: 'Common' as const,
    rarity: 'Common' as const,
    tags: [...ITEM_FIXTURES[2].tags],
    properties: [...ITEM_FIXTURES[2].properties],
  }
  const resolvedVariant = {
    ...ITEM_FIXTURES[2],
    id: 'enchanted-longsword',
    name: 'Enchanted Longsword',
    basePriceGp: 415,
    subtype: 'Enchanted blade',
    description: 'A longsword empowered by the selected variant.',
    tags: ['resolved-variant'],
    properties: ['Combined base and variant property'],
    attunement: true,
    source: 'TST',
    origin: 'specificVariant' as const,
  }
  const genericVariant = {
    ...ITEM_FIXTURES[2],
    id: 'test-weapon-variant',
    name: 'Test Weapon Variant',
    basePriceGp: null,
    description: 'The magic available before choosing a base weapon.',
    tags: ['generic-variant'],
    properties: ['Variant-only property'],
    source: 'TST',
    origin: 'genericVariant' as const,
    variantPriceGp: 400,
    variantOptions: [{
      id: resolvedVariant.id,
      baseItemId: 'longsword-base',
      baseName: 'Longsword',
      baseSource: 'PHB',
      basePriceGp: 15,
      variantPriceGp: 400,
      effectivePriceGp: 415,
      resolvedItem: resolvedVariant,
    }],
  }
  const catalog = [commonItem, commonWeapon, ...ITEM_FIXTURES, genericVariant, ...filler]
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

    const initialTable = await screen.findByRole('table')
    const mundaneRow = within(initialTable).getByRole('row', { name: /Hempen Rope/i })
    expect(within(mundaneRow).getAllByRole('cell')[1]).toHaveTextContent('📦Mundane')

    await user.click(screen.getByRole('radio', { name: 'Magic' }))

    const table = screen.getByRole('table')
    const row = within(table).getByRole('row', { name: /Bag of Holding/i })
    const cells = within(row).getAllByRole('cell')

    expect(within(table).getByRole('columnheader', { name: 'Item type' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
    expect(within(cells[0]).getByText('Bag of Holding')).toBeInTheDocument()
    expect(within(cells[0]).getByTitle("Source: DMG'14")).toHaveTextContent(/^DMG'14$/)
    expect(within(cells[0]).getByTitle("Source: DMG'14")).toHaveClass('source-chip')
    expect(cells[0].querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
    expect(cells[1]).toHaveTextContent('✨Magic')
    expect(cells[1]).not.toHaveTextContent('Bag/Container')
    expect(cells[2]).toHaveTextContent('Bag/Container')
    expect(within(cells[2]).queryByText('Container')).not.toBeInTheDocument()
  })

  it('starts item type expanded and lists only the ordered facets available for the selected type', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.queryByText(/\d+ of \d+ items/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Search items')).toHaveClass('search-field')

    const toggles = [
      'Item type', 'Rarity', 'Category',
      // 'Availability',
    ].map((name) => screen.getByRole('button', { name }))
    expect(toggles.map((toggle) => toggle.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false'])

    await user.click(screen.getByRole('button', { name: 'Category' }))
    expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'true')

    const categoryFilter = screen.getByRole('group', { name: 'Category' })
    const categoryNames = within(categoryFilter).getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-pressed'))
      .map((button) => button.querySelector('span:last-child')?.textContent ?? button.textContent)

    expect(categoryNames).toEqual(['All', 'Adventuring Gear', 'Weapon'])
    expect(new Set(categoryNames).size).toBe(categoryNames.length)

    await user.click(screen.getByRole('button', { name: 'Rarity' }))
    const rarityFilter = screen.getByRole('group', { name: 'Rarity' })
    expect(within(rarityFilter).getAllByRole('checkbox').map((checkbox) => checkbox.parentElement?.textContent)).toEqual(['None', 'Common'])

    await user.click(screen.getByRole('radio', { name: 'Magic' }))

    expect(within(categoryFilter).getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-pressed'))
      .map((button) => button.querySelector('span:last-child')?.textContent ?? button.textContent)).toEqual(['All', 'Bag/Container', 'Gem', 'Weapon'])
    expect(within(rarityFilter).getAllByRole('checkbox').map((checkbox) => checkbox.parentElement?.textContent)).toEqual(['Uncommon', 'Rare', 'Legendary'])
  })

  it('applies the All category rules and supports multiple category chips', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Category' }))

    const all = screen.getByRole('button', { name: 'All' })
    const adventuringGear = screen.getByRole('button', { name: 'Adventuring Gear' })
    const weapon = screen.getByRole('button', { name: 'Weapon' })

    expect(all).toHaveAttribute('aria-pressed', 'true')
    expect(all).toHaveClass('category-chip')
    await user.click(all)
    expect(all).toHaveAttribute('aria-pressed', 'true')

    await user.click(adventuringGear)
    expect(all).toHaveAttribute('aria-pressed', 'false')
    expect(adventuringGear).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('row', { name: /Hempen Rope/i })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Practice Sword/i })).not.toBeInTheDocument()

    await user.click(weapon)
    expect(adventuringGear).toHaveAttribute('aria-pressed', 'true')
    expect(weapon).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('row', { name: /Practice Sword/i })).toBeInTheDocument()

    await user.click(adventuringGear)
    expect(adventuringGear).toHaveAttribute('aria-pressed', 'false')
    expect(weapon).toHaveAttribute('aria-pressed', 'true')

    await user.click(all)
    expect(all).toHaveAttribute('aria-pressed', 'true')
    expect(weapon).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('row', { name: /Hempen Rope/i })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Practice Sword/i })).toBeInTheDocument()
  })

  it('removes unavailable facets and preserves compatible ones when the item type changes', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByRole('table')
    await user.click(screen.getByRole('button', { name: 'Rarity' }))
    await user.click(screen.getByRole('button', { name: 'Category' }))

    await user.click(screen.getByRole('checkbox', { name: 'None' }))
    await user.click(screen.getByRole('button', { name: 'Adventuring Gear' }))
    expect(screen.getByRole('row', { name: /Hempen Rope/i })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Magic' }))

    expect(screen.queryByRole('checkbox', { name: 'None' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adventuring Gear' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('row', { name: /Bag of Holding/i })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Mundane' }))
    await user.click(screen.getByRole('button', { name: 'Weapon' }))
    await user.click(screen.getByRole('radio', { name: 'Magic' }))

    expect(screen.getByRole('button', { name: 'Weapon' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('row', { name: /Vicious Longsword/i })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Bag of Holding/i })).not.toBeInTheDocument()
  })

  it('allows only one item type to be selected at a time', async () => {
    const user = userEvent.setup()
    renderApp()

    const itemTypeFilter = screen.getByRole('group', { name: 'Item type' })
    const radios = within(itemTypeFilter).getAllByRole('radio')
    const [common, magic] = radios

    expect(radios.map((radio) => radio.parentElement?.textContent)).toEqual(['📦Mundane', '✨Magic'])
    expect(within(itemTypeFilter).getByText('Mundane')).toHaveClass('text-[11px]', 'font-medium', 'uppercase')

    expect(magic).not.toBeChecked()
    expect(common).toBeChecked()

    const clearButton = screen.getByRole('button', { name: 'Clear all filters' })
    expect(clearButton).toHaveClass('primary-button')
    expect(clearButton).toBeEnabled()

    await user.click(magic)
    expect(magic).toBeChecked()
    expect(common).not.toBeChecked()
    expect(clearButton).toBeEnabled()

    await user.click(common)
    expect(magic).not.toBeChecked()
    expect(common).toBeChecked()

    await user.click(magic)
    await user.type(screen.getByLabelText('Search items'), 'rope')
    await user.click(clearButton)

    expect(screen.getByLabelText('Search items')).toHaveValue('')
    expect(common).toBeChecked()
    expect(magic).not.toBeChecked()
    expect(clearButton).toBeEnabled()
  })

  it('shows the mundane item type label in item details and the full sheet', async () => {
    const user = userEvent.setup()
    renderApp()

    const details = await screen.findByLabelText('Hempen Rope details')
    expect(within(details).getByText('Mundane')).toBeInTheDocument()

    await user.click(within(details).getByRole('button', { name: 'View full item sheet' }))
    expect(within(screen.getByRole('dialog', { name: 'Hempen Rope' })).getByText('Mundane')).toBeInTheDocument()
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
    await user.click(screen.getByText('Price modifiers'))
    await user.type(screen.getByLabelText('Modifier name'), 'Festival tax')
    await user.type(screen.getByLabelText('Modifier percent'), '10')
    await user.click(screen.getByRole('button', { name: 'Add custom modifier' }))
    expect(screen.getAllByText(/Festival tax/).length).toBeGreaterThan(0)
    expect(screen.getByText('4,400 GP')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Festival tax' }))
    expect(screen.queryByText(/Festival tax/)).not.toBeInTheDocument()
  })

  it('shows the base price card and applies independent buy and sell modifiers', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('radio', { name: 'Magic' }))
    expect((await screen.findAllByText('Bag of Holding')).length).toBeGreaterThan(0)

    expect(screen.getByLabelText('Base price')).toHaveTextContent('Base price4,000 GP')
    const priceModifiers = screen.getByText('Price modifiers').parentElement!
    expect(priceModifiers).not.toHaveAttribute('open')
    await user.click(screen.getByText('Price modifiers'))
    expect(priceModifiers).toHaveAttribute('open')

    const economy = screen.getByRole('combobox', { name: 'Economy' })
    expect(within(economy).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Stable Economy · Base (B 0% | S 0%)',
      'Prosperous Economy · B +20% | S +20%',
      'Depressed Economy · B -10% | S -10%',
    ])

    const market = screen.getByRole('combobox', { name: 'Market' })
    expect(within(market).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Regular Market · Base (B 0% | S 0%)',
      'Competitive Market · B -20% | S -15%',
      'Black Market · B +35% | S +30%',
      'Restricted Market · B +25% | S +25%',
    ])

    await user.selectOptions(market, 'competitive')
    expect(screen.getByText('3,200 GP')).toBeInTheDocument()
    expect(screen.getByText('1,700 GP')).toBeInTheDocument()

    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
    const marketAdjustment = screen.getByText('Market · Competitive Market').parentElement!
    expect(within(marketAdjustment).getByText('-20%')).toBeInTheDocument()
    expect(within(marketAdjustment).getByText('-15%')).toBeInTheDocument()
    const adjustmentTotal = screen.getByText('Total').parentElement!
    expect(within(adjustmentTotal).getByText('-20%')).toHaveClass('negative')
    expect(within(adjustmentTotal).getByText('-15%')).toHaveClass('negative')
  })

  it('lists a generic variant once and prices it from the selected base item', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('radio', { name: 'Magic' }))
    const search = screen.getAllByLabelText('Search items')[0]
    await user.type(search, 'Test Weapon Variant')

    const row = await screen.findByRole('row', { name: /Test Weapon Variant/i })
    expect(within(row).getByText('◇ Variable')).toBeInTheDocument()
    await user.click(row)

    const details = (await screen.findAllByLabelText('Test Weapon Variant details'))[0]
    expect(within(details).getByText("Select a base item to calculate this variant's price.")).toBeInTheDocument()
    await user.click(within(details).getByRole('button', { name: 'View full item sheet' }))

    const genericDialog = screen.getByRole('dialog', { name: 'Test Weapon Variant' })
    expect(within(genericDialog).getByText('The magic available before choosing a base weapon.')).toBeInTheDocument()
    expect(within(genericDialog).getByText('Variant-only property')).toBeInTheDocument()
    expect(within(genericDialog).getByText('generic-variant')).toBeInTheDocument()
    expect(within(genericDialog).getByText('400 GP')).toBeInTheDocument()
    await user.click(within(genericDialog).getByRole('button', { name: 'Close item sheet' }))

    const baseSelector = within(details).getByRole('combobox', { name: 'Compatible base item' })
    await user.selectOptions(baseSelector, 'enchanted-longsword')

    const baseCard = within(details).getByRole('region', { name: 'Base item' })
    expect(within(baseCard).getByText('15 GP')).toBeInTheDocument()
    expect(within(baseCard).getByText('400 GP')).toBeInTheDocument()
    expect(within(baseCard).getByText('415 GP')).toBeInTheDocument()
    expect(within(details).getByLabelText('Base price')).toHaveTextContent('415 GP')

    await user.click(within(details).getByRole('button', { name: 'View full item sheet' }))
    const resolvedDialog = screen.getByRole('dialog', { name: 'Enchanted Longsword' })
    expect(within(resolvedDialog).getByText('A longsword empowered by the selected variant.')).toBeInTheDocument()
    expect(within(resolvedDialog).getByText('Enchanted blade')).toBeInTheDocument()
    expect(within(resolvedDialog).getByText('Combined base and variant property')).toBeInTheDocument()
    expect(within(resolvedDialog).getByText('resolved-variant')).toBeInTheDocument()
    expect(within(resolvedDialog).getByText('Required')).toBeInTheDocument()
    expect(within(resolvedDialog).getByText('415 GP')).toBeInTheDocument()
    expect(within(resolvedDialog).getByText(/Configured with/)).toHaveTextContent('Configured with Longsword from PHB.')
    await user.click(within(resolvedDialog).getByRole('button', { name: 'Close item sheet' }))

    await user.clear(search)
    await user.click(screen.getByRole('row', { name: /Bag of Holding/i }))
    await waitFor(() => expect(screen.queryAllByRole('combobox', { name: 'Compatible base item' })).toHaveLength(0))
  })
})
