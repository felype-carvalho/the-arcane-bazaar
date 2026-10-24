import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import { ItemModal } from './ItemModal'

describe('ItemModal', () => {
    it('shows every category in the complete sheet', () => {
        render(<ItemModal item={{ ...ITEM_FIXTURES[0], categories: ['Bag/Container', 'Consumable', 'Wondrous'] }} onClose={vi.fn()} />)
        const categories = screen.getByLabelText('Item categories')
        expect(within(categories).getByText('Bag/Container')).toBeInTheDocument()
        expect(within(categories).getByText('Consumable')).toBeInTheDocument()
        expect(within(categories).getByText('Wondrous')).toBeInTheDocument()
    })

    it('renders all characteristics as complete paragraphs', () => {
        render(<ItemModal item={ITEM_FIXTURES[0]} onClose={vi.fn()} />)

        const dialog = screen.getByRole('dialog', { name: 'Bag of Holding' })
        const heading = within(dialog).getByRole('heading', { name: 'Description' })
        const section = heading.closest('section')
        const firstProperty = within(section as HTMLElement).getByText('Carries up to 500 lb')
        const secondProperty = within(section as HTMLElement).getByText('Interior volume of 64 cubic feet')
        expect(firstProperty.tagName).toBe('P')
        expect(secondProperty.tagName).toBe('P')
        expect(within(section as HTMLElement).getByText(ITEM_FIXTURES[0].description)).toBeInTheDocument()
    })

    it('renders description tables with column headers and cells in order', () => {
        render(<ItemModal item={{ ...ITEM_FIXTURES[0], descriptionBlocks: [
            { type: 'paragraph', text: 'Roll a d6:' },
            { type: 'table', columns: ['d6', 'Lycanthropy'], rows: [['1-3', 'Wererat'], ['4-5', 'Werewolf'], ['6', 'Wereboar']] },
            { type: 'paragraph', text: 'End of description.' },
        ] }} onClose={vi.fn()} />)

        const section = screen.getByRole('heading', { name: 'Description' }).closest('section') as HTMLElement
        const table = within(section).getByRole('table')
        expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['d6', 'Lycanthropy'])
        expect(within(table).getAllByRole('row').map((row) => row.textContent)).toEqual(['d6Lycanthropy', '1-3Wererat', '4-5Werewolf', '6Wereboar'])
        expect(within(section).getByText('Roll a d6:').compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(table.compareDocumentPosition(within(section).getByText('End of description.')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('bolds an opening description label through its colon', () => {
        render(<ItemModal item={{ ...ITEM_FIXTURES[0], characteristics: ['Passengers: This indicates the number of riders.', 'The effect lasts. Duration: 1 hour.'] }} onClose={vi.fn()} />)

        const label = screen.getByText('Passengers:')
        expect(label.tagName).toBe('STRONG')
        expect(label.closest('p')).toHaveTextContent('Passengers: This indicates the number of riders.')
        expect(screen.getByText('The effect lasts. Duration: 1 hour.').querySelector('strong')).toBeNull()
    })

    it('hides the properties section when the item has no properties', () => {
        render(<ItemModal item={{ ...ITEM_FIXTURES[0], properties: [], description: '' }} onClose={vi.fn()} />)

        const dialog = screen.getByRole('dialog', { name: 'Bag of Holding' })
        expect(within(dialog).queryByRole('heading', { name: 'Description' })).not.toBeInTheDocument()
    })
})


it('shows a neutral configuration summary and the effective stage data', () => {
    render(<ItemModal item={{ ...ITEM_FIXTURES[0], name: 'Pulverizing Staff of Skulls', rarity: 'Very Rare', basePriceGp: 40000 }} configurationSummary="Pulverizing" onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Pulverizing Staff of Skulls' })
    expect(within(dialog).getByText('Very Rare')).toBeInTheDocument()
    expect(within(dialog).getByText('Configuration: Pulverizing')).toBeInTheDocument()
    expect(within(dialog).queryByText(/Configured with/)).not.toBeInTheDocument()
    expect(within(dialog).getByText('40,000 GP')).toBeInTheDocument()
})


it('hides absent data and preserves valid zero values', () => {
    const { rerender } = render(<ItemModal item={{ ...ITEM_FIXTURES[0], rarity: 'None', weight: '—', categories: [], basePriceGp: null, characteristics: [] }} onClose={vi.fn()} />)
    for (const label of ['Weight', 'Attunement', 'Requirement', 'Categories', 'Base price', 'Description', 'Weapon information', 'Armor information', 'Tags']) {
        expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
    rerender(<ItemModal item={{ ...ITEM_FIXTURES[0], basePriceGp: 0, weight: '0 lb', sourcePage: 0, hasExplicitPrice: true }} onClose={vi.fn()} />)
    expect(screen.getByText('0 GP')).toBeInTheDocument()
    expect(screen.getByText('0 lb')).toBeInTheDocument()
    expect(screen.getByText('p. 0')).toBeInTheDocument()
    expect(screen.queryByText('Estimated')).not.toBeInTheDocument()
})

it('shows estimates, source, attunement and structured equipment information', () => {
    render(<ItemModal item={{ ...ITEM_FIXTURES[0], hasExplicitPrice: false, sourcePage: 153, attunement: true, attunementRequirement: 'by a wizard', weaponInformation: [{ label: 'Range', value: '150/600 ft.' }, { label: 'Mastery', value: 'Slow' }], characteristics: ['First paragraph', 'Second paragraph', 'First paragraph'] }} onClose={vi.fn()} />)
    for (const text of ['Estimated', 'p. 153', 'by a wizard', '150/600 ft.', 'Slow', 'Second paragraph']) expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getAllByText('First paragraph')).toHaveLength(1)
    expect(screen.getByTitle(/Source:/)).toHaveClass('source-chip')
    expect(screen.queryByText('Armor information')).not.toBeInTheDocument()
})

it('shows weapon cards in three columns with capitalized values and distinct icons', () => {
    render(<ItemModal item={{
        ...ITEM_FIXTURES[0],
        weaponInformation: [
            { label: 'Base Damage', value: '1d8 slashing' },
            { label: 'Weapon Type', value: 'martial · Melee weapon' },
            { label: 'Properties', value: 'special, Two-Handed' },
            { label: 'Range', value: '20/60 ft.' },
            { label: 'Magic attack / damage bonus', value: '+1' },
        ],
    }} onClose={vi.fn()} />)

    const section = screen.getByRole('heading', { name: 'Weapon information' }).closest('section') as HTMLElement
    expect(section.querySelector('dl')).toHaveClass('grid-cols-3')
    expect(within(section).getByText('Special, Two-Handed')).toBeInTheDocument()
    expect(within(section).getByText('Martial · Melee weapon')).toBeInTheDocument()
    for (const [label, icon] of [['Base Damage', 'sword'], ['Weapon Type', 'axe'], ['Properties', 'table-properties'], ['Range', 'bow-arrow'], ['Magic attack / damage bonus', 'wand-sparkles']]) {
        const card = within(section).getByText(label).closest('div')?.parentElement
        expect(card?.querySelector('svg')).toHaveClass(`lucide-${icon}`)
    }
})

it('shows armor without weapon information', () => {
    render(<ItemModal item={{ ...ITEM_FIXTURES[0], armorInformation: [
        { label: 'AC bonus', value: '+2' },
        { label: 'Armor type', value: 'Heavy armor' },
        { label: 'Strength requirement', value: '15' },
        { label: 'Stealth', value: 'Disadvantage' },
        { label: 'Magic AC bonus', value: '+1' },
    ] }} onClose={vi.fn()} />)
    const section = screen.getByRole('heading', { name: 'Armor information' }).closest('section') as HTMLElement
    expect(within(section).getByText('+2')).toBeInTheDocument()
    for (const [label, icon] of [['Armor type', 'shield-cog'], ['Strength requirement', 'biceps-flexed'], ['Stealth', 'hat-glasses'], ['Magic AC bonus', 'wand-sparkles']]) {
        const card = within(section).getByText(label).closest('div')?.parentElement
        expect(card?.querySelector('svg')).toHaveClass(`lucide-${icon}`)
    }
    expect(screen.queryByText('Weapon information')).not.toBeInTheDocument()
})

it('shows available vehicle information with its own icons', () => {
    render(<ItemModal item={{
        ...ITEM_FIXTURES[0],
        category: 'Vehicle',
        categories: ['Vehicle'],
        vehicleInformation: [
            { label: 'Speed', value: '10 mph' },
            { label: 'Carrying Capacity', value: '10 tons cargo · 30 passengers' },
            { label: 'Crew', value: '6–10' },
            { label: 'AC', value: '15' },
            { label: 'HP', value: '300' },
            { label: 'Damage Threshold', value: '20' },
            { label: 'Personal Travel Cost', value: '2 GP per mile per passenger' },
            { label: 'Shipping Cost', value: '1 GP per 100 lb per mile' },
        ],
    }} onClose={vi.fn()} />)

    const section = screen.getByRole('heading', { name: 'Vehicle Information' }).closest('section') as HTMLElement
    expect(section.querySelector('dl')).toHaveClass('grid-cols-3')
    for (const [label, icon] of [['Speed', 'circle-gauge'], ['Carrying Capacity', 'package'], ['Crew', 'user-star'], ['AC', 'shield'], ['HP', 'heart-plus'], ['Damage Threshold', 'shield-lock'], ['Personal Travel Cost', 'hand-coins'], ['Shipping Cost', 'package-2']]) {
        const card = within(section).getByText(label).closest('div')?.parentElement
        expect(card?.querySelector('svg')).toHaveClass(`lucide-${icon}`)
    }
})

it('shows mount information in three columns with its own icons and omits absent values', () => {
    const { rerender } = render(<ItemModal item={{
        ...ITEM_FIXTURES[0],
        category: 'Mount',
        categories: ['Mount'],
        mountInformation: [
            { label: 'Speed', value: '50 ft.' },
            { label: 'Carrying Capacity', value: '480 lb' },
            { label: 'Monster Stat Block', value: 'Camel' },
        ],
    }} onClose={vi.fn()} />)

    const section = screen.getByRole('heading', { name: 'Mount Information' }).closest('section') as HTMLElement
    expect(section.querySelector('dl')).toHaveClass('grid-cols-3')
    for (const [label, icon] of [['Speed', 'circle-gauge'], ['Carrying Capacity', 'package'], ['Monster Stat Block', 'panda']]) {
        const card = within(section).getByText(label).closest('div')?.parentElement
        expect(card?.querySelector('svg')).toHaveClass(`lucide-${icon}`)
    }

    rerender(<ItemModal item={{ ...ITEM_FIXTURES[0], category: 'Mount', categories: ['Mount'], mountInformation: [{ label: 'Speed', value: '' }] }} onClose={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'Mount Information' })).not.toBeInTheDocument()
})

it('shows spellcasting focus requirements with the requested icon and hides absent information', () => {
    const { rerender } = render(<ItemModal item={{
        ...ITEM_FIXTURES[0], category: 'Spellcasting Focus', categories: ['Spellcasting Focus'],
        spellcastingFocusInformation: [{ label: 'Spellcasting Focus Requirement', value: 'Sorcerer, Warlock, Wizard' }],
    }} onClose={vi.fn()} />)
    const section = screen.getByRole('heading', { name: 'Spellcasting Focus Information' }).closest('section') as HTMLElement
    expect(section.querySelector('dl')).toHaveClass('grid-cols-3')
    expect(within(section).getByText('Sorcerer, Warlock, Wizard')).toBeInTheDocument()
    expect(within(section).getByText('Spellcasting Focus Requirement').closest('div')?.parentElement?.querySelector('svg')).toHaveClass('lucide-message-circle-check')

    rerender(<ItemModal item={{ ...ITEM_FIXTURES[0], category: 'Spellcasting Focus', categories: ['Spellcasting Focus'] }} onClose={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'Spellcasting Focus Information' })).not.toBeInTheDocument()
})

it('closes by button, Escape and backdrop, traps focus and restores it', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const onClose = vi.fn()
    const { unmount } = render(<ItemModal item={ITEM_FIXTURES[0]} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    const close = screen.getByRole('button', { name: 'Close item sheet' })
    expect(dialog).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(close).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.mouseDown(dialog)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(close)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.mouseDown(dialog.parentElement!)
    expect(onClose).toHaveBeenCalledTimes(3)
    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
})
