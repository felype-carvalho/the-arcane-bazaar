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

it('shows armor without weapon information', () => {
    render(<ItemModal item={{ ...ITEM_FIXTURES[0], armorInformation: [{ label: 'AC bonus', value: '+2' }] }} onClose={vi.fn()} />)
    expect(screen.getByText('Armor information')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.queryByText('Weapon information')).not.toBeInTheDocument()
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
