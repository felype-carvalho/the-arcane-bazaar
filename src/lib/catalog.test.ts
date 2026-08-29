import { describe, expect, it } from 'vitest'
import { ITEMS } from '../data/items'
import { EMPTY_FILTERS, filterAndSortItems } from './catalog'

describe('filterAndSortItems', () => {
  it('searches by item name without case sensitivity', () => {
    const result = filterAndSortItems(ITEMS, { ...EMPTY_FILTERS, search: 'PEARL' }, 'name', 'asc')
    expect(result.map((item) => item.name)).toEqual(['Pearl of Power'])
  })

  it('uses OR within a group and AND between groups', () => {
    const result = filterAndSortItems(ITEMS, {
      ...EMPTY_FILTERS,
      rarities: ['Rare', 'Legendary'],
      categories: ['Weapon'],
      availabilities: ['Limited'],
    }, 'name', 'asc')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((item) => ['Rare', 'Legendary'].includes(item.rarity) && item.category === 'Weapon' && item.availability === 'Limited')).toBe(true)
  })

  it('sorts fixed prices before variable prices in ascending order', () => {
    const result = filterAndSortItems(ITEMS, EMPTY_FILTERS, 'price', 'asc')
    const firstVariableIndex = result.findIndex((item) => item.basePriceGp == null)
    expect(firstVariableIndex).toBeGreaterThan(0)
    expect(result.slice(0, firstVariableIndex).every((item) => item.basePriceGp != null)).toBe(true)
    expect(result.slice(firstVariableIndex).every((item) => item.basePriceGp == null)).toBe(true)
  })
})
