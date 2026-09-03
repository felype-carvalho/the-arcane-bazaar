import type { Category, Item, ItemFilters, ItemType, Rarity, SortDirection, SortKey } from '../types'
import { CATEGORIES } from './items/categories'

export const RARITIES: readonly Rarity[] = ['None', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies', 'Unknown']

const RARITY_ORDER = Object.fromEntries(RARITIES.map((rarity, index) => [rarity, index])) as Record<Rarity, number>

export const EMPTY_FILTERS: ItemFilters = { search: '', types: [], rarities: [], categories: [], availabilities: [] }

export interface AvailableFilterOptions {
  rarities: Rarity[]
  categories: Category[]
}

export function getAvailableFilterOptions(items: readonly Item[], type: ItemType): AvailableFilterOptions {
  const rarities = new Set<Rarity>()
  const categories = new Set<Category>()

  for (const item of items) {
    if (item.type !== type) continue
    rarities.add(item.rarity)
    categories.add(item.category)
  }

  return {
    rarities: RARITIES.filter((rarity) => rarities.has(rarity)),
    categories: CATEGORIES.filter((category) => categories.has(category)),
  }
}

export function filterAndSortItems(items: Item[], filters: ItemFilters, sortKey: SortKey, direction: SortDirection): Item[] {
  const query = filters.search.trim().toLocaleLowerCase()
  const filtered = items.filter((item) => {
    if (query && !item.name.toLocaleLowerCase().includes(query)) return false
    if (filters.types.length && !filters.types.includes(item.type)) return false
    if (filters.rarities.length && !filters.rarities.includes(item.rarity)) return false
    if (filters.categories.length && !filters.categories.includes(item.category)) return false
    // if (filters.availabilities.length && !filters.availabilities.includes(item.availability)) return false
    return true
  })

  return filtered.sort((a, b) => {
    let result = 0
    if (sortKey === 'name') result = a.name.localeCompare(b.name)
    if (sortKey === 'type') result = a.type.localeCompare(b.type)
    if (sortKey === 'category') result = a.category.localeCompare(b.category)
    if (sortKey === 'rarity') result = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
    if (sortKey === 'price') {
      if (a.basePriceGp == null && b.basePriceGp == null) result = a.name.localeCompare(b.name)
      else if (a.basePriceGp == null) result = 1
      else if (b.basePriceGp == null) result = -1
      else result = a.basePriceGp - b.basePriceGp
    }
    return direction === 'asc' ? result : -result
  })
}
