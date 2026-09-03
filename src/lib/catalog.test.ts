import { describe, expect, it } from 'vitest'
import { ITEM_FIXTURES } from '../test/fixtures/items'
import { EMPTY_FILTERS, filterAndSortItems, getAvailableFilterOptions } from './catalog'

describe('filterAndSortItems', () => {
  it('searches by item name without case sensitivity', () => {
    const result = filterAndSortItems(ITEM_FIXTURES, { ...EMPTY_FILTERS, search: 'PEARL' }, 'name', 'asc')
    expect(result.map((item) => item.name)).toEqual(['Pearl of Power'])
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
    })
    expect(getAvailableFilterOptions(items, 'Magic')).toEqual({
      rarities: ['Uncommon', 'Rare', 'Legendary'],
      categories: ['Bag/Container', 'Gem', 'Weapon'],
    })
  })

  it('returns empty filter options without mutating the catalog when the type has no items', () => {
    const items = ITEM_FIXTURES.map((item) => ({ ...item }))
    const snapshot = items.map((item) => ({ ...item }))

    expect(getAvailableFilterOptions(items, 'Common')).toEqual({ rarities: [], categories: [] })
    expect(items).toEqual(snapshot)
  })
})
