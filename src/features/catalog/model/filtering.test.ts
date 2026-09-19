import { describe, expect, it } from 'vitest'
import { ITEM_FIXTURES } from '../test/fixtures/items'
import { EMPTY_FILTERS, filterAndSortItems, getAvailableFilterOptions } from './filtering'
import type { Item } from '../types'

describe('filterAndSortItems', () => {
    it('deduplicates and sorts normalized sources for the selected item type', () => {
        const items: Item[] = [
            { ...ITEM_FIXTURES[0], source: ' xdmg ' },
            { ...ITEM_FIXTURES[1], source: 'dmg' },
            { ...ITEM_FIXTURES[2], source: ' DMG ' },
            { ...ITEM_FIXTURES[3], type: 'Common', source: 'PHB' },
        ]
        expect(getAvailableFilterOptions(items, 'Magic').sources).toEqual(['DMG', 'XDMG'])
        expect(getAvailableFilterOptions(items, 'Common').sources).toEqual(['PHB'])
    })

    it('uses OR between sources and AND with other filters without matching variant bases', () => {
        const variant: Item = {
            ...ITEM_FIXTURES[2], id: 'variant', source: 'DMG', origin: 'genericVariant',
            variantOptions: [{ id: 'option', baseItemId: 'base', baseName: 'Blade', baseSource: 'PHB', basePriceGp: 15, variantPriceGp: 100, effectivePriceGp: 115, resolvedItem: ITEM_FIXTURES[2] }],
        }
        const modern = { ...ITEM_FIXTURES[0], source: 'XDMG' }
        const items = [variant, modern]
        expect(filterAndSortItems(items, { ...EMPTY_FILTERS, sources: [' dmg ', 'XDMG'] }, 'name', 'asc')).toHaveLength(2)
        expect(filterAndSortItems(items, { ...EMPTY_FILTERS, sources: ['DMG', 'XDMG'], categories: ['Weapon'], rarities: ['Rare'], search: 'vicious' }, 'name', 'asc')).toEqual([variant])
        expect(filterAndSortItems(items, { ...EMPTY_FILTERS, sources: ['PHB'] }, 'name', 'asc')).toEqual([])
        expect(filterAndSortItems(items, { ...EMPTY_FILTERS, sources: ['DMG'] }, 'name', 'asc')[0].variantOptions).toBe(variant.variantOptions)
        expect(filterAndSortItems(items, EMPTY_FILTERS, 'name', 'asc')).toHaveLength(2)
    })

    it('filters additional categories using OR without duplicating items and preserves primary sorting', () => {
        const items: Item[] = [
            { ...ITEM_FIXTURES[0], categories: ['Bag/Container', 'Consumable', 'Wondrous'] },
            { ...ITEM_FIXTURES[1], categories: ['Gem', 'Wondrous'] },
            ITEM_FIXTURES[2],
        ]
        expect(filterAndSortItems(items, { ...EMPTY_FILTERS, categories: ['Wondrous', 'Consumable'] }, 'category', 'asc').map((item) => item.id))
            .toEqual(['bag-of-holding', 'pearl-of-power'])
        expect(filterAndSortItems(items, { ...EMPTY_FILTERS, categories: ['Consumable'] }, 'name', 'asc').map((item) => item.id)).toEqual(['bag-of-holding'])
        expect(getAvailableFilterOptions(items, 'Magic').categories).toEqual(['Bag/Container', 'Consumable', 'Gem', 'Weapon', 'Wondrous'])
        expect(getAvailableFilterOptions(items, 'Common').categories).toEqual([])
    })

    it('searches by item name without case sensitivity', () => {
        const result = filterAndSortItems(ITEM_FIXTURES, { ...EMPTY_FILTERS, search: 'PEARL' }, 'name', 'asc')
        expect(result.map((item) => item.name)).toEqual(['Pearl of Power'])
    })

    it('searches generic variants by compatible base-item tags', () => {
        const variant = { ...ITEM_FIXTURES[0], id: 'generic', name: 'Weapon Enchantment', tags: ['longsword'], origin: 'genericVariant' as const }
        const result = filterAndSortItems([variant], { ...EMPTY_FILTERS, search: 'LONGSWORD' }, 'name', 'asc')
        expect(result.map((item) => item.name)).toEqual(['Weapon Enchantment'])
    })

    it('uses OR within a group and AND between groups', () => {
        const result = filterAndSortItems(ITEM_FIXTURES, {
            ...EMPTY_FILTERS,
            rarities: ['Rare', 'Legendary'],
            categories: ['Weapon'],
            // availabilities: ['Limited'],
        }, 'name', 'asc')
        expect(result.length).toBeGreaterThan(0)
        expect(result.every((item) => ['Rare', 'Legendary'].includes(item.rarity) && item.category === 'Weapon')).toBe(true)
    })

    it('filters items using the updated categories', () => {
        const result = filterAndSortItems(ITEM_FIXTURES, {
            ...EMPTY_FILTERS,
            categories: ['Bag/Container'],
        }, 'name', 'asc')

        expect(result.map((item) => item.name)).toEqual(['Bag of Holding'])
    })

    it('sorts fixed prices before variable prices in ascending order', () => {
        const result = filterAndSortItems(ITEM_FIXTURES, EMPTY_FILTERS, 'price', 'asc')
        const firstVariableIndex = result.findIndex((item) => item.basePriceGp == null)
        expect(firstVariableIndex).toBeGreaterThan(0)
        expect(result.slice(0, firstVariableIndex).every((item) => item.basePriceGp != null)).toBe(true)
        expect(result.slice(firstVariableIndex).every((item) => item.basePriceGp == null)).toBe(true)
    })

    it('sorts items by category', () => {
        const result = filterAndSortItems(ITEM_FIXTURES, EMPTY_FILTERS, 'category', 'asc')
        const categories = result.map((item) => item.category)

        expect(categories).toEqual([...categories].sort((a, b) => a.localeCompare(b)))
    })

    it('derives deduplicated filter options for the selected item type in canonical order', () => {
        const commonItems = [
            { ...ITEM_FIXTURES[2], id: 'common-weapon', type: 'Common' as const, rarity: 'Rare' as const },
            { ...ITEM_FIXTURES[0], id: 'common-bag', type: 'Common' as const, rarity: 'None' as const },
            { ...ITEM_FIXTURES[3], id: 'another-common-weapon', type: 'Common' as const, rarity: 'Rare' as const },
        ]
        const items = [...ITEM_FIXTURES, ...commonItems]

        expect(getAvailableFilterOptions(items, 'Common')).toEqual({
            rarities: ['None', 'Rare'],
            categories: ['Bag/Container', 'Weapon'],
            sources: ['DMG'],
        })
        expect(getAvailableFilterOptions(items, 'Magic')).toEqual({
            rarities: ['Uncommon', 'Rare', 'Legendary'],
            categories: ['Bag/Container', 'Gem', 'Weapon'],
            sources: ['DMG'],
        })
    })

    it('returns empty filter options without mutating the catalog when the type has no items', () => {
        const items = ITEM_FIXTURES.map((item) => ({ ...item }))
        const snapshot = items.map((item) => ({ ...item }))

        expect(getAvailableFilterOptions(items, 'Common')).toEqual({ rarities: [], categories: [], sources: [] })
        expect(items).toEqual(snapshot)
    })
})


it('discovers a group through member names and rarities without duplicating rows or facets', () => {
    const group: Item = { ...ITEM_FIXTURES[0], rarity: 'Varies', availableRarities: ['Common', 'Rare'], tags: ['cantrip', '5th level'] }
    expect(filterAndSortItems([group], { ...EMPTY_FILTERS, search: 'Cantrip', rarities: ['Common'] }, 'name', 'asc')).toEqual([group])
    expect(filterAndSortItems([group], { ...EMPTY_FILTERS, rarities: ['Varies'] }, 'name', 'asc')).toEqual([group])
    expect(filterAndSortItems([group], { ...EMPTY_FILTERS, rarities: ['Legendary'] }, 'name', 'asc')).toEqual([])
    expect(getAvailableFilterOptions([group, group], 'Magic').rarities).toEqual(['Common', 'Rare', 'Varies'])
})
