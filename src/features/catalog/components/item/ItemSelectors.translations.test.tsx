import { useState } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import i18n from '@/app/i18n'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import type { Item, ItemGroupOption, VariantBaseOption } from '../../types'
import { BaseItemSelector } from './BaseItemSelector'
import { GroupOptionSelector } from './GroupOptionSelector'

afterEach(async () => {
    await act(() => i18n.changeLanguage('en-US'))
})

function baseOption(id: string, baseName: string, baseSource = 'PHB'): VariantBaseOption {
    return {
        id,
        baseName,
        baseSource,
        baseItemId: `baseitem--${baseSource.toLowerCase()}--${baseName.toLowerCase()}`,
        basePriceGp: 10,
        variantPriceGp: 100,
        effectivePriceGp: 110,
        resolvedItem: ITEM_FIXTURES[0],
    }
}

it('reorders translated bases within each source and preserves the selected option ID', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const options = [baseOption('club-z', 'Club'), baseOption('dagger', 'Dagger'), baseOption('club-a', 'Club'), baseOption('new-club', 'Club', 'XPHB')]
    function Harness() {
        const [selectedId, setSelectedId] = useState('')
        return <BaseItemSelector item={{ ...ITEM_FIXTURES[0], variantOptions: options }} selectedOption={options.find((option) => option.id === selectedId)} onSelect={(id) => { setSelectedId(id); onSelect(id) }} />
    }
    render(<Harness />)
    const select = screen.getByRole('combobox', { name: 'Compatible base item' })
    const optionIds = () => within(select).getAllByRole('option').map((option) => (option as HTMLOptionElement).value)
    expect(optionIds()).toEqual(['', 'new-club', 'club-a', 'club-z', 'dagger'])
    await user.selectOptions(select, 'club-z')

    await act(() => i18n.changeLanguage('pt-BR'))
    expect(screen.getByRole('combobox', { name: 'Item base compatível' })).toBe(select)
    expect(optionIds()).toEqual(['', 'new-club', 'dagger', 'club-a', 'club-z'])
    expect(select).toHaveValue('club-z')
    expect(within(select).getByRole('option', { name: /Adaga/ })).toHaveValue('dagger')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('club-z')
})

it('keeps the initial stage first and updates group labels without changing the selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const member = (id: string, label: string): ItemGroupOption => ({
        id, label, source: 'PHB', kind: 'member', rarityOrigin: 'explicit',
        resolvedItem: { ...ITEM_FIXTURES[0], id: `baseitem--phb--${label.toLowerCase()}`, name: label },
    })
    const options: ItemGroupOption[] = [member('club', 'Club'), member('dagger', 'Dagger'), {
        ...member('initial', 'Initial'), kind: 'inferredInitialStage', rarityOrigin: 'inferred',
    }]
    const item: Item = { ...ITEM_FIXTURES[0], groupOptions: options }
    function Harness() {
        const [selectedId, setSelectedId] = useState('')
        return <GroupOptionSelector item={item} selectedOption={options.find((option) => option.id === selectedId)} onSelect={(id) => { setSelectedId(id); onSelect(id) }} />
    }
    render(<Harness />)
    const select = screen.getByRole('combobox', { name: 'Evolution stage' })
    await user.selectOptions(select, 'club')
    await act(() => i18n.changeLanguage('pt-BR'))
    expect(select).toHaveValue('club')
    expect(within(select).getAllByRole('option').map((option) => (option as HTMLOptionElement).value)).toEqual(['', 'initial', 'dagger', 'club'])
    expect(within(select).getByRole('option', { name: /^Inicial/ })).toHaveValue('initial')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('club')
})
