import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { formatSourceTitle } from '@/features/catalog/components/item/SourceChip'
import App from './App'
import { Catalog } from '@/features/catalog/components/Catalog'

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

const testCatalogState = vi.hoisted(() => ({ includeGroups: false }))

vi.mock('@/features/catalog/api/catalog', async () => {
    const { ITEM_FIXTURES } = await import('@/features/catalog/test/fixtures/items')
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
        categories: ['Adventuring Gear' as const],
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
        source: 'XDMG',
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
        source: 'XDMG',
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
    const modernItem = {
        ...ITEM_FIXTURES[0],
        id: 'modern-satchel',
        name: 'Modern Satchel',
        source: 'XDMG',
        edition: 'one' as const,
        tags: [...ITEM_FIXTURES[0].tags],
        properties: [...ITEM_FIXTURES[0].properties],
    }
    const { buildCatalog } = await import('@/features/catalog/model/items/build-catalog')
    const { default: items } = await import('@/features/catalog/data/items.json')
    const { default: base } = await import('@/features/catalog/data/items-base.json')
    const { default: variants } = await import('@/features/catalog/data/magicvariants.json')
    const groups = buildCatalog({ items, base, variants } as unknown as import('@/features/catalog/model/items/raw-types').ItemJsonFiles)
        .filter((item) => item.origin === 'itemGroup' && ['Spellwrought Tattoo', 'Staff of Skulls', "Dragon's Wrath Weapon"].includes(item.name))
    const catalog = [commonItem, commonWeapon, ...ITEM_FIXTURES, modernItem, genericVariant, ...filler]
    return { getItems: () => Promise.resolve([...catalog, ...(testCatalogState.includeGroups ? groups : [])].map((item) => ({ ...item, tags: [...item.tags], properties: [...item.properties] }))) }
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
        expect(within(cells[0]).getByTitle(formatSourceTitle('DMG'))).toHaveTextContent(/^DMG'14$/)
        expect(within(cells[0]).getByTitle(formatSourceTitle('DMG'))).toHaveClass('source-chip')
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
            'Item type', 'Category',
            // 'Availability',
        ].map((name) => screen.getByRole('button', { name }))
        expect(toggles.map((toggle) => toggle.getAttribute('aria-expanded'))).toEqual(['true', 'false'])
        expect(screen.queryByRole('button', { name: 'Rarity' })).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Category' }))
        expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'true')

        const categoryFilter = screen.getByRole('group', { name: 'Category' })
        const categoryNames = within(categoryFilter).getAllByRole('button')
            .filter((button) => button.hasAttribute('aria-pressed'))
            .map((button) => button.querySelector('span:last-child')?.textContent ?? button.textContent)

        expect(categoryNames).toEqual(['All', 'Adventuring Gear', 'Weapon'])
        expect(new Set(categoryNames).size).toBe(categoryNames.length)

        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        await user.click(screen.getByRole('button', { name: 'Rarity' }))
        const rarityFilter = screen.getByRole('group', { name: 'Rarity' })

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
        await user.click(screen.getByRole('button', { name: 'Category' }))

        await user.click(screen.getByRole('button', { name: 'Adventuring Gear' }))
        expect(screen.getByRole('row', { name: /Hempen Rope/i })).toBeInTheDocument()

        await user.click(screen.getByRole('radio', { name: 'Magic' }))

        expect(screen.queryByRole('checkbox', { name: 'None' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Adventuring Gear' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('row', { name: /Bag of Holding/i })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Rarity' }))
        await user.click(screen.getByRole('checkbox', { name: 'Uncommon' }))
        await user.click(screen.getByRole('radio', { name: 'Mundane' }))
        expect(screen.queryByRole('button', { name: 'Rarity' })).not.toBeInTheDocument()
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
        const dialog = screen.getByRole('dialog', { name: 'Hempen Rope' })
        const typeMark = within(dialog).getByText('Mundane')
        expect(typeMark).toHaveClass('font-medium', 'uppercase', 'tracking-[0.15em]', 'text-slate-400')
        expect(typeMark.closest('.type-pill')).toBeInTheDocument()
        expect(within(dialog).queryByText('Available')).not.toBeInTheDocument()
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

    it('changes the number of rows per page and returns to the first page', async () => {
        const user = userEvent.setup()
        renderApp()
        await screen.findByRole('table')
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        const pageSize = screen.getByRole('combobox', { name: 'Items per page' })
        expect(pageSize).toHaveValue('20')
        await user.selectOptions(pageSize, '10')
        expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11)
        await user.click(screen.getByRole('button', { name: 'Next page' }))
        expect(screen.getByRole('button', { name: 'Page 2, current page' })).toBeInTheDocument()
        await user.selectOptions(pageSize, '50')
        expect(screen.getByRole('button', { name: 'Page 1, current page' })).toBeInTheDocument()
        expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(25)
        expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
        await user.selectOptions(pageSize, '100')
        expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(25)
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
        expect(within(details).getByRole('button', { name: 'View full item sheet' })).toBeDisabled()

        const baseSelector = within(details).getByRole('combobox', { name: 'Compatible base item' })
        await user.selectOptions(baseSelector, 'enchanted-longsword')

        const baseCard = within(details).getByRole('region', { name: 'Base item' })
        expect(baseCard.querySelector('dl')).toBeNull()
        expect(within(baseCard).queryByText('Longsword')).not.toBeInTheDocument()
        const calculator = within(details).getByRole('region', { name: 'Price this item' })
        const selectedBasePriceCard = calculator.querySelector<HTMLElement>('.selected-base-price-card')!
        const priceBreakdown = within(selectedBasePriceCard)
        expect(priceBreakdown.getByText('Longsword')).toBeInTheDocument()
        expect(priceBreakdown.getByText("PHB'14")).toBeInTheDocument()
        expect(priceBreakdown.getByText('15 GP')).toBeInTheDocument()
        expect(priceBreakdown.getByText('400 GP')).toBeInTheDocument()
        expect(priceBreakdown.getByText('415 GP')).toBeInTheDocument()
        expect(within(details).getByLabelText('Base price')).toHaveTextContent('415 GP')

        await user.click(within(details).getByRole('button', { name: 'View full item sheet' }))
        const resolvedDialog = screen.getByRole('dialog', { name: 'Enchanted Longsword' })
        expect(within(resolvedDialog).getByText('A longsword empowered by the selected variant.')).toBeInTheDocument()
        expect(within(resolvedDialog).getByText('Enchanted blade')).toBeInTheDocument()
        expect(within(resolvedDialog).getByText('Combined base and variant property')).toBeInTheDocument()
        expect(within(resolvedDialog).getByText('resolved-variant')).toBeInTheDocument()
        expect(within(resolvedDialog).getByText('Required')).toBeInTheDocument()
        expect(within(resolvedDialog).getByText('415 GP')).toBeInTheDocument()
        expect(within(resolvedDialog).getByText(/Configuration:/)).toHaveTextContent('Longsword (PHB)')
        await user.click(within(resolvedDialog).getByRole('button', { name: 'Close item sheet' }))

        await user.clear(search)
        await user.click(screen.getByRole('row', { name: /Bag of Holding/i }))
        await waitFor(() => expect(screen.queryAllByRole('combobox', { name: 'Compatible base item' })).toHaveLength(0))
    })

    it('persists a source selection and restores every source when local data is reset', async () => {
        const user = userEvent.setup()
        const firstRender = renderApp()
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        expect(await screen.findByRole('row', { name: /Bag of Holding/i })).toBeInTheDocument()
        expect(screen.getByRole('row', { name: /Modern Satchel/i })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Open system menu' }))
        await user.click(screen.getByRole('menuitem', { name: 'Settings' }))
        const dmgChip = screen.getByRole('button', { name: formatSourceTitle('DMG') })
        await waitFor(() => expect(dmgChip).toBeEnabled())
        await user.click(dmgChip)

        await waitFor(() => expect(dmgChip).toBeEnabled())
        expect(dmgChip).toHaveAttribute('aria-pressed', 'false')
        expect(screen.queryByRole('row', { name: /Bag of Holding/i })).not.toBeInTheDocument()
        expect(screen.getByRole('row', { name: /Modern Satchel/i })).toBeInTheDocument()

        firstRender.unmount()
        renderApp()
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        expect(await screen.findByRole('row', { name: /Modern Satchel/i })).toBeInTheDocument()
        expect(screen.queryByRole('row', { name: /Bag of Holding/i })).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Open system menu' }))
        await user.click(screen.getByRole('menuitem', { name: 'Settings' }))
        const persistedChip = screen.getByRole('button', { name: formatSourceTitle('DMG') })
        await waitFor(() => expect(persistedChip).toBeEnabled())
        expect(persistedChip).toHaveAttribute('aria-pressed', 'false')

        await user.click(screen.getByRole('button', { name: 'Reset local data' }))
        await user.click(screen.getByRole('button', { name: 'Reset IndexedDB' }))

        await waitFor(() => expect(persistedChip).toHaveAttribute('aria-pressed', 'true'))
        expect(await screen.findByRole('row', { name: /Bag of Holding/i })).toBeInTheDocument()
        expect(screen.getByText('Local data reset to defaults.')).toBeInTheDocument()
    })
})


describe('group configuration flows', () => {
    beforeEach(() => { testCatalogState.includeGroups = true })
    afterEach(() => { testCatalogState.includeGroups = false })

    it('clears a hidden base selection and does not restore it when its source returns', async () => {
        const user = userEvent.setup()
        const { rerender } = render(<Catalog selectedSources={['FTD', 'PHB', 'XPHB']} />)
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        const details = (await screen.findAllByLabelText("Dragon's Wrath Weapon details"))[0]
        const selector = within(details).getByRole('combobox', { name: 'Item version' })
        await user.selectOptions(selector, (within(selector).getByRole('option', { name: /Wakened/ }) as HTMLOptionElement).value)
        const baseSelector = within(details).getByRole('combobox', { name: 'Compatible base item' })
        const longsword = within(baseSelector).getByRole('option', { name: /Longsword.*PHB'24/ }) as HTMLOptionElement
        await user.selectOptions(baseSelector, longsword.value)
        expect(within(details).getByLabelText('Base price')).toBeInTheDocument()
        rerender(<Catalog selectedSources={['FTD', 'PHB']} />)
        await waitFor(() => expect(screen.queryAllByLabelText('Base price')).toHaveLength(0))
        rerender(<Catalog selectedSources={['FTD', 'PHB', 'XPHB']} />)
        await waitFor(() => expect(screen.getAllByRole('combobox', { name: 'Item version' })[0]).toHaveValue(''))
        expect(screen.queryAllByRole('combobox', { name: 'Compatible base item' })).toHaveLength(0)
        expect(screen.queryAllByLabelText('Base price')).toHaveLength(0)
    })
    it('updates tattoo rarity, price and sheet in both detail panels and clears choices when changing groups', async () => {
        const user = userEvent.setup()
        renderApp()
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        const search = screen.getAllByLabelText('Search items')[0]
        await user.type(search, 'Spellwrought Tattoo')
        const row = await screen.findByRole('row', { name: /Spellwrought Tattoo/i })
        await user.click(row)
        const details = screen.getAllByLabelText('Spellwrought Tattoo details')[0]
        expect(within(details).getByText('Varies')).toBeInTheDocument()
        expect(within(details).getByRole('button', { name: 'View full item sheet' })).toBeDisabled()
        expect(within(details).queryByLabelText('Manual base price (GP)')).not.toBeInTheDocument()
        const selector = within(details).getByRole('combobox', { name: 'Item version' })
        const option = within(selector).getByRole('option', { name: /5th Level/ }) as HTMLOptionElement
        await user.selectOptions(selector, option.value)
        for (const panel of screen.getAllByLabelText('Spellwrought Tattoo (5th Level) details')) {
            expect(within(panel).getByText('Rare')).toBeInTheDocument()
            expect(within(panel).getByLabelText('Base price')).toHaveTextContent('4,000 GP')
        }
        await user.click(within(details).getByRole('button', { name: 'View full item sheet' }))
        const dialog = screen.getByRole('dialog', { name: 'Spellwrought Tattoo (5th Level)' })
        expect(within(dialog).getByText('Rare')).toBeInTheDocument()
        expect(within(dialog).getByText(/Configuration:/)).toHaveTextContent('5th Level')
        await user.keyboard('{Escape}')
        await user.clear(search)
        await user.type(search, 'Staff of Skulls')
        const staff = screen.getAllByLabelText('Staff of Skulls details')[0]
        const stages = within(staff).getByRole('combobox', { name: 'Evolution stage' })
        expect(stages).toHaveValue('')
        expect(within(stages).getByRole('option', { name: /Initial.*Common.*inferred/ })).toBeInTheDocument()
        await user.selectOptions(stages, (within(stages).getByRole('option', { name: /Pulverizing/ }) as HTMLOptionElement).value)
        expect(within(staff).getByText('Very Rare')).toBeInTheDocument()
    })

    it('requires a dragon stage and base and resets the base when switching stages', async () => {
        const user = userEvent.setup()
        renderApp()
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        await user.type(screen.getAllByLabelText('Search items')[0], "Dragon's Wrath Weapon")
        const details = (await screen.findAllByLabelText("Dragon's Wrath Weapon details"))[0]
        const selector = within(details).getByRole('combobox', { name: 'Item version' })
        expect(within(details).queryByRole('combobox', { name: 'Compatible base item' })).not.toBeInTheDocument()
        await user.selectOptions(selector, (within(selector).getByRole('option', { name: /Wakened/ }) as HTMLOptionElement).value)
        const baseSelector = within(details).getByRole('combobox', { name: 'Compatible base item' })
        expect(within(details).getByRole('button', { name: 'View full item sheet' })).toBeDisabled()
        const longsword = within(baseSelector).getAllByRole('option', { name: /^Longsword/ })[0] as HTMLOptionElement
        await user.selectOptions(baseSelector, longsword.value)
        expect(within(details).getByRole('heading', { name: "Wakened Dragon's Wrath Longsword" })).toBeInTheDocument()
        expect(within(details).getByLabelText('Base price')).toBeInTheDocument()
        await user.click(within(details).getByRole('button', { name: 'View full item sheet' }))
        expect(within(screen.getByRole('dialog')).getByText(/Configuration:/)).toHaveTextContent('Longsword')
        await user.keyboard('{Escape}')
        await user.selectOptions(selector, (within(selector).getByRole('option', { name: /Stirring/ }) as HTMLOptionElement).value)
        expect(baseSelector).toHaveValue('')
        expect(within(details).queryByLabelText('Base price')).not.toBeInTheDocument()
        expect(within(details).getByText('Rare')).toBeInTheDocument()
        expect(within(details).getByRole('button', { name: 'View full item sheet' })).toBeDisabled()
    })
})
