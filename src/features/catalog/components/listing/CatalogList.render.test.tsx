import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import { CatalogList } from './CatalogList'

describe('catalog category presentation', () => {
    it('shows a configurable group as variable in desktop and mobile listings', () => {
        render(<CatalogList items={[{ ...ITEM_FIXTURES[0], rarity: 'Varies', basePriceGp: 100, groupOptions: [] }]} sortKey="name" direction="asc" onSort={vi.fn()} onSelect={vi.fn()} />)
        expect(screen.getAllByText(/Variable/)).toHaveLength(2)
        expect(screen.getAllByText('Varies')).toHaveLength(2)
        expect(screen.queryByText('100 GP')).not.toBeInTheDocument()
    })
    it('shows all category names and icons in the table and mobile card while retaining the subtype', () => {
        render(<CatalogList items={[{ ...ITEM_FIXTURES[0], categories: ['Bag/Container', 'Consumable', 'Wondrous'] }]} sortKey="category" direction="asc" onSort={vi.fn()} onSelect={vi.fn()} />)
        const groups = screen.getAllByLabelText('Item categories')
        expect(groups).toHaveLength(2)
        for (const group of groups) {
            expect(within(group).getByText('Bag/Container')).toBeInTheDocument()
            expect(within(group).getByText('Consumable')).toBeInTheDocument()
            expect(within(group).getByText('Wondrous')).toBeInTheDocument()
            expect(within(group).getByText('✨')).toHaveAttribute('aria-hidden', 'true')
        }
        expect(screen.getByText('Container')).toBeInTheDocument()
    })
})
