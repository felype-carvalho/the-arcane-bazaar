import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import type { Item } from '../../types'
import { GroupOptionSelector } from './GroupOptionSelector'

const item: Item = { ...ITEM_FIXTURES[0], groupOptions: [
    { id: 'initial', label: 'Initial', source: 'AU', kind: 'inferredInitialStage', rarityOrigin: 'inferred', resolvedItem: { ...ITEM_FIXTURES[0], rarity: 'Common' } },
    { id: 'stage', label: 'Ominous', source: 'AU', kind: 'member', rarityOrigin: 'explicit', resolvedItem: { ...ITEM_FIXTURES[0], rarity: 'Uncommon' } },
] }

describe('GroupOptionSelector', () => {
    it('provides an accessible selector with rarity and explicit inference text', async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(<GroupOptionSelector item={item} onSelect={onSelect} />)
        const select = screen.getByRole('combobox', { name: 'Evolution stage' })
        expect(select).toHaveValue('')
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Select an item version', 'Initial — Common (inferred)', 'Ominous — Uncommon'])
        expect(screen.getByRole('option', { name: 'Select an item version' })).toBeDisabled()
        await user.tab()
        expect(select).toHaveFocus()
        await user.selectOptions(select, 'stage')
        expect(onSelect).toHaveBeenCalledWith('stage')
    })

    it('orders versions by ascending rarity, then name, keeping the initial stage first', () => {
        const options = item.groupOptions!
        const member = options[1]
        render(<GroupOptionSelector item={{ ...item, groupOptions: [
            { ...member, id: 'legendary', label: 'Alpha', resolvedItem: { ...member.resolvedItem, rarity: 'Legendary' } },
            { ...member, id: 'rare-z', label: 'Zulu', resolvedItem: { ...member.resolvedItem, rarity: 'Rare' } },
            { ...member, id: 'rare-a', label: 'Alpha', resolvedItem: { ...member.resolvedItem, rarity: 'Rare' } },
            member,
            options[0],
        ] }} onSelect={vi.fn()} />)
        expect(screen.getAllByRole('option').map((option) => (option as HTMLOptionElement).value))
            .toEqual(['', 'initial', 'stage', 'rare-a', 'rare-z', 'legendary'])
    })

    it('explains missing versions instead of rendering an unusable selector', () => {
        render(<GroupOptionSelector item={{ ...item, groupOptions: [] }} onSelect={vi.fn()} />)
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
        expect(screen.getByText('No valid item versions were found for this group.')).toBeInTheDocument()
    })
})
