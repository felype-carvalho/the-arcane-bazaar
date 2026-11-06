import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/app/i18n'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import { CatalogList } from './CatalogList'

afterEach(async () => {
    await act(() => i18n.changeLanguage('en-US'))
})

describe('catalog category presentation', () => {
    it('shows bilingual tooltips and preserves source-specific fallback when switching language', async () => {
        const items = [
            { ...ITEM_FIXTURES[0], id: 'item--phb--backpack', name: 'Backpack', source: 'PHB' },
            { ...ITEM_FIXTURES[0], id: 'item--untranslated--backpack', name: 'Backpack', source: 'UNTRANSLATED' },
        ]
        render(<CatalogList items={items} sortKey="name" direction="asc" onSort={vi.fn()} onSelect={vi.fn()} />)
        const names = screen.getAllByText('Backpack')
        fireEvent.mouseEnter(names[0])
        expect(screen.getByRole('tooltip')).toHaveTextContent('English: Backpack Português: Mochila')
        fireEvent.keyDown(document, { key: 'Escape' })
        fireEvent.mouseEnter(names[1])
        expect(screen.getByRole('tooltip')).toHaveTextContent('English: Backpack Português: Backpack')
        await act(() => i18n.changeLanguage('pt-BR'))
        fireEvent.mouseEnter(screen.getAllByText('Mochila')[0])
        expect(screen.getByRole('tooltip')).toHaveTextContent('English: Backpack Português: Mochila')
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.getAllByText('Mochila')).toHaveLength(2)
        expect(screen.getAllByText('Backpack')).toHaveLength(2)
    })

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
            expect(within(group).getByText('🌟')).toHaveAttribute('aria-hidden', 'true')
        }
        expect(screen.getByText('Container')).toBeInTheDocument()
    })
})
