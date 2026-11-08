import { act, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/app/i18n'
import { MeasurementProvider } from '@/features/measurements'
import { ItemModal } from './ItemModal'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import { getItemImages } from '../../model/items/item-images'
import { buildCatalog } from '../../model/items/build-catalog'
import type { ItemJsonFiles } from '../../model/items/raw-types'
import items from '../../data/items.json'
import base from '../../data/items-base.json'
import variants from '../../data/magicvariants.json'

vi.mock('../../model/items/item-images', () => ({
    getItemImages: vi.fn().mockResolvedValue([{ src: 'https://example.com/jug.png' }]),
}))

afterEach(async () => {
    await act(() => i18n.changeLanguage('en-US'))
    vi.clearAllMocks()
})

describe('translated item sheet', () => {
    it('shows unique translated properties for the initial Blade of the Guardian', async () => {
        const catalog = buildCatalog({ items, base, variants } as unknown as ItemJsonFiles)
        const group = catalog.find((item) => item.name === 'Blade of the Guardian' && item.source === 'AU')!
        const initial = group.groupOptions!.find((option) => option.kind === 'inferredInitialStage')!
        const item = initial.resolvedItem.variantOptions![0].resolvedItem
        expect(item.rarity).toBe(initial.resolvedItem.rarity)
        expect(item.weaponInformation).toContainEqual({ label: 'Properties', value: 'Heavy, Two-Handed, Evolving Item' })

        await act(() => i18n.changeLanguage('pt-BR'))
        render(<ItemModal item={item} onClose={vi.fn()} />)
        const dialog = screen.getByRole('dialog', { name: 'Lâmina do Guardião' })
        expect(within(dialog).getByText('Pesada, Duas Mãos, Item Evolutivo')).toBeInTheDocument()
        expect(within(dialog).queryByText(/Heavy, Two-Handed/)).not.toBeInTheDocument()

        await act(() => i18n.changeLanguage('en-US'))
        expect(within(dialog).getByText('Heavy, Two-Handed, Evolving Item')).toBeInTheDocument()
        expect(within(dialog).queryByText('Heavy, Two-Handed, Heavy, Two-Handed, Evolving Item')).not.toBeInTheDocument()
    })

    it.each([
        ['metric', '120 ml'],
        ['imperial', '4 onças fluidas'],
    ] as const)('updates an open sheet with %s units without changing artwork lookup or table measurements', async (liquids, expected) => {
        const item = {
            ...ITEM_FIXTURES[0],
            id: 'item--xdmg--alchemy-jug', name: 'Alchemy Jug', source: 'XDMG',
            descriptionBlocks: [{ type: 'table' as const, caption: 'Alchemy Jug Liquids', columns: ['Liquid', 'Max. Amount'], rows: [['Basic Poison', '4 ounces']] }],
        }
        render(<MeasurementProvider preferences={{ distance: 'metric', weight: 'metric', speed: 'metric', liquids }}>
            <ItemModal item={item} onClose={vi.fn()} />
        </MeasurementProvider>)
        expect(await screen.findByRole('img')).toHaveAttribute('alt', 'Alchemy Jug')
        expect(getItemImages).toHaveBeenCalledWith('Alchemy Jug', 'XDMG', undefined)
        const calls = vi.mocked(getItemImages).mock.calls.length

        await act(() => i18n.changeLanguage('pt-BR'))

        expect(screen.getByRole('dialog', { name: 'Jarro Alquímico' })).toBeInTheDocument()
        expect(screen.getByRole('img')).toHaveAttribute('alt', 'Jarro Alquímico')
        const table = screen.getByRole('table')
        expect(within(table).getByRole('columnheader', { name: 'Líquido' })).toBeInTheDocument()
        expect(within(table).getByText('Veneno Básico')).toBeInTheDocument()
        expect(table.textContent).toContain(expected)
        expect(getItemImages).toHaveBeenCalledTimes(calls)

        await act(() => i18n.changeLanguage('en-US'))
        expect(screen.getByRole('dialog', { name: 'Alchemy Jug' })).toBeInTheDocument()
        expect(within(table).getByText('Basic Poison')).toBeInTheDocument()
    })
})
