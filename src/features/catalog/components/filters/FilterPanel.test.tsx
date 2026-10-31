import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_FILTERS } from '../../model/filtering'
import { FilterPanel } from './FilterPanel'
import i18n from '@/app/i18n'

describe('category filter visibility', () => {
    it('reorders categories by the selected language while preserving selections and internal values', async () => {
        const user = userEvent.setup()
        const onCategorySelect = vi.fn()
        const availableCategories = Object.freeze(['Amulet', 'Armor', 'Staff / Rod', 'Weapon'] as const)
        await i18n.changeLanguage('en-US')
        render(<FilterPanel
            filters={{ ...EMPTY_FILTERS, types: ['Magic'], categories: ['Armor'] }}
            availableRarities={[]}
            availableCategories={availableCategories}
            availableSources={[]}
            onSearch={vi.fn()}
            onTypeSelect={vi.fn()}
            onToggle={vi.fn()}
            onCategorySelect={onCategorySelect}
            onSourceSelect={vi.fn()}
            onClear={vi.fn()}
        />)
        const categoryNames = (groupName: string) => within(screen.getByRole('group', { name: groupName }))
            .getAllByRole('button').slice(1).map((button) => button.lastElementChild?.textContent ?? button.textContent)

        try {
            expect(categoryNames('Category')).toEqual(['All', 'Amulet', 'Armor', 'Staff / Rod', 'Weapon'])
            await act(() => i18n.changeLanguage('pt-BR'))
            expect(categoryNames('Categoria')).toEqual(['Todos', 'Amuleto', 'Arma', 'Armadura', 'Cajado / Cetro'])
            expect(screen.getByRole('button', { name: 'Armadura' })).toHaveAttribute('aria-pressed', 'true')
            await user.click(screen.getByRole('button', { name: 'Arma' }))
            expect(onCategorySelect).toHaveBeenCalledWith('Weapon')
            await act(() => i18n.changeLanguage('en-US'))
            expect(categoryNames('Category')).toEqual(['All', 'Amulet', 'Armor', 'Staff / Rod', 'Weapon'])
            expect(screen.getByRole('button', { name: 'Armor' })).toHaveAttribute('aria-pressed', 'true')
        } finally {
            await act(() => i18n.changeLanguage('en-US'))
        }
    })

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

        expect(screen.getByRole('button', { name: 'Category' })).toHaveAttribute('aria-expanded', 'true')

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
