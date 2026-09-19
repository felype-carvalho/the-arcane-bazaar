import { describe, expect, it } from 'vitest'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import type { Item } from '../../types'
import { resolveItemSelection } from './resolve-item-selection'

const concrete = ITEM_FIXTURES[0]
const variant: Item = { ...concrete, id: 'variant', variantOptions: [{ id: 'base', baseItemId: 'base', baseName: 'Blade', baseSource: 'PHB', basePriceGp: 15, variantPriceGp: 400, effectivePriceGp: 415, resolvedItem: concrete }] }
const group: Item = { ...concrete, groupOptions: [
    { id: 'member', label: 'Concrete', source: 'DMG', kind: 'member', rarityOrigin: 'explicit', resolvedItem: concrete },
    { id: 'variant', label: 'Variant', source: 'DMG', kind: 'member', rarityOrigin: 'explicit', resolvedItem: variant },
] }

describe('selection resolution', () => {
    it('resolves ordinary items and direct variants', () => {
        expect(resolveItemSelection(concrete).effectiveItem).toBe(concrete)
        expect(resolveItemSelection(concrete).pendingSelection).toBeUndefined()
        expect(resolveItemSelection(variant).pendingSelection).toBe('baseItem')
        expect(resolveItemSelection(variant, '', 'base')).toMatchObject({ effectiveItem: concrete, pendingSelection: undefined })
    })

    it('requires a member before accepting a base and uses only the selected family', () => {
        expect(resolveItemSelection(group, '', 'base')).toMatchObject({ pendingSelection: 'groupOption', selectedBaseOption: undefined })
        expect(resolveItemSelection(group, 'member', 'base')).toMatchObject({ effectiveItem: concrete, selectedBaseOption: undefined, pendingSelection: undefined })
        expect(resolveItemSelection(group, 'variant')).toMatchObject({ effectiveItem: variant, pendingSelection: 'baseItem' })
        expect(resolveItemSelection(group, 'variant', 'base')).toMatchObject({ effectiveItem: concrete, pendingSelection: undefined })
        expect(resolveItemSelection(group, 'missing', 'base').pendingSelection).toBe('groupOption')
        expect(resolveItemSelection(group, 'variant', 'missing').pendingSelection).toBe('baseItem')
    })
})
