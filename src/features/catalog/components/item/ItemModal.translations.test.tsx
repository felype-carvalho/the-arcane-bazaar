import { act, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/app/i18n'
import { MeasurementProvider } from '@/features/measurements'
import { ItemModal } from './ItemModal'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import { getItemImages } from '../../model/items/item-images'

vi.mock('../../model/items/item-images', () => ({
    getItemImages: vi.fn().mockResolvedValue([{ src: 'https://example.com/jug.png' }]),
}))

afterEach(async () => {
    await act(() => i18n.changeLanguage('en-US'))
    vi.clearAllMocks()
})

describe('translated item sheet', () => {
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
