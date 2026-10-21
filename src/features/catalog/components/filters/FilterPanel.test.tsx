import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_FILTERS } from '../../model/filtering'
import { FilterPanel } from './FilterPanel'

describe('category filter visibility', () => {
    it('reveals Cursed when magic categories become available', async () => {
        const user = userEvent.setup()
        const onCategorySelect = vi.fn()
        const commonProps = {
            availableRarities: [],
            availableSources: [],
            onSearch: vi.fn(),
            onTypeSelect: vi.fn(),
            onToggle: vi.fn(),
            onCategorySelect,
            onSourceSelect: vi.fn(),
            onClear: vi.fn(),
        }
        const { rerender } = render(
            <FilterPanel {...commonProps} filters={{ ...EMPTY_FILTERS, types: ['Common'] }} availableCategories={['Armor']} />,
        )

        expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'false')

        rerender(
            <FilterPanel {...commonProps} filters={{ ...EMPTY_FILTERS, types: ['Magic'] }} availableCategories={['Armor', 'Cursed']} />,
        )

        const categoryFilter = screen.getByRole('group', { name: 'Category' })
        expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'true')
        await user.click(within(categoryFilter).getByRole('button', { name: 'Cursed' }))
        expect(onCategorySelect).toHaveBeenCalledWith('Cursed')

        await user.click(screen.getByRole('button', { name: 'Category' }))
        rerender(
            <FilterPanel {...commonProps} filters={{ ...EMPTY_FILTERS, types: ['Magic'] }} availableCategories={['Armor', 'Cursed', 'Weapon']} />,
        )
        expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'false')
    })
})
