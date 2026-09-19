import type { Category, Item, ItemFilters, ItemType, Rarity, SortDirection, SortKey } from '../types'
import { CATEGORIES } from './items/categories'
import { normalizeSource } from './sources'

export const RARITIES: readonly Rarity[] = ['None', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies', 'Unknown']

const RARITY_ORDER = Object.fromEntries(RARITIES.map((rarity, index) => [rarity, index])) as Record<Rarity, number>

export const EMPTY_FILTERS: ItemFilters = { search: '', types: [], rarities: [], categories: [], availabilities: [], sources: [] }

export interface AvailableFilterOptions {
    rarities: Rarity[]
    categories: Category[]
    sources: string[]
}

export function getAvailableFilterOptions(items: readonly Item[], type: ItemType): AvailableFilterOptions {
    const rarities = new Set<Rarity>()
    const categories = new Set<Category>()
    const sources = new Set<string>()

    for (const item of items) {
        if (item.type !== type) continue
        rarities.add(item.rarity)
        for (const rarity of item.availableRarities ?? []) rarities.add(rarity)
        sources.add(normalizeSource(item.source))
        for (const category of item.categories) categories.add(category)
    }

    return {
        rarities: RARITIES.filter((rarity) => rarities.has(rarity)),
        categories: CATEGORIES.filter((category) => categories.has(category)),
        sources: [...sources].sort((left, right) => left.localeCompare(right, 'en-US')),
    }
}

export function filterAndSortItems(items: Item[], filters: ItemFilters, sortKey: SortKey, direction: SortDirection): Item[] {
    const query = filters.search.trim().toLocaleLowerCase()
    const sources = new Set(filters.sources.map(normalizeSource))
    const filtered = items.filter((item) => {
        if (query && !item.name.toLocaleLowerCase().includes(query) && !item.tags.some((tag) => tag.toLocaleLowerCase().includes(query))) return false
        if (filters.types.length && !filters.types.includes(item.type)) return false
        if (filters.rarities.length && !filters.rarities.includes(item.rarity) && !item.availableRarities?.some((rarity) => filters.rarities.includes(rarity))) return false
        if (filters.categories.length && !item.categories.some((category) => filters.categories.includes(category))) return false
        if (sources.size && !sources.has(normalizeSource(item.source))) return false
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
