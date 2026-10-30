import { ALL_SOURCE_CODES, normalizeSource } from '@/features/catalog'
import { CATEGORIES } from '@/features/catalog/model/items/categories'
import { RARITIES } from '@/features/catalog/model/filtering'
import type { Availability, Category, ItemFilters, ItemType, Rarity } from '@/features/catalog/types'

const FILTER_KEYS = ['search', 'types', 'rarities', 'categories', 'availabilities', 'sources']
const ITEM_TYPES: readonly ItemType[] = ['Common', 'Magic']
const AVAILABILITIES: readonly Availability[] = ['Available', 'Limited', 'Unavailable']
const SOURCE_CODES = new Set(ALL_SOURCE_CODES.map(normalizeSource))

function stringList(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function allowedList<T extends string>(value: unknown, allowed: readonly T[]): value is T[] {
    return stringList(value) && value.every((entry) => allowed.includes(entry as T))
}

function knownValues<T extends string>(value: unknown, allowed: readonly T[]): T[] {
    return stringList(value) ? value.filter((entry): entry is T => allowed.includes(entry as T)) : []
}

export function isKnownFilterSource(source: string): boolean {
    return SOURCE_CODES.has(normalizeSource(source))
}

export function isValidCatalogFilters(value: unknown): value is ItemFilters {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
    const filters = value as Record<string, unknown>
    return Object.keys(filters).length === FILTER_KEYS.length
        && FILTER_KEYS.every((key) => Object.hasOwn(filters, key))
        && typeof filters.search === 'string'
        && allowedList(filters.types, ITEM_TYPES) && filters.types.length <= 1
        && allowedList(filters.rarities, RARITIES)
        && allowedList(filters.categories, CATEGORIES)
        && allowedList(filters.availabilities, AVAILABILITIES)
        && stringList(filters.sources) && filters.sources.every(isKnownFilterSource)
}

export function normalizeCatalogFilters(value: unknown): ItemFilters {
    const filters = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
    return {
        search: typeof filters.search === 'string' ? filters.search : '',
        types: stringList(filters.types) ? knownValues(filters.types, ITEM_TYPES).slice(0, 1) : ['Common'],
        rarities: knownValues<Rarity>(filters.rarities, RARITIES),
        categories: knownValues<Category>(filters.categories, CATEGORIES),
        availabilities: knownValues<Availability>(filters.availabilities, AVAILABILITIES),
        sources: stringList(filters.sources)
            ? filters.sources.filter(isKnownFilterSource).map(normalizeSource)
            : [],
    }
}
