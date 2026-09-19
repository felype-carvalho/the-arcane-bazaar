import { render, screen, within } from '@testing-library/react'
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

    it('renders every property with an icon inside a single card', () => {
        render(<ItemModal item={ITEM_FIXTURES[0]} onClose={vi.fn()} />)

        const dialog = screen.getByRole('dialog', { name: 'Bag of Holding' })
        const heading = within(dialog).getByRole('heading', { name: 'Properties' })
        const section = heading.closest('section')
        const firstProperty = within(section as HTMLElement).getByText('Carries up to 500 lb')
        const secondProperty = within(section as HTMLElement).getByText('Interior volume of 64 cubic feet')
        const propertyCard = firstProperty.closest('ul')

        expect(propertyCard).toBe(secondProperty.closest('ul'))
        expect(propertyCard).toHaveClass('rounded', 'border', 'bg-surface')
        expect(propertyCard?.querySelectorAll('.lucide-sparkles')).toHaveLength(2)
    })

    it('hides the properties section when the item has no properties', () => {
        render(<ItemModal item={{ ...ITEM_FIXTURES[0], properties: [] }} onClose={vi.fn()} />)

        const dialog = screen.getByRole('dialog', { name: 'Bag of Holding' })
        expect(within(dialog).queryByRole('heading', { name: 'Properties' })).not.toBeInTheDocument()
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
