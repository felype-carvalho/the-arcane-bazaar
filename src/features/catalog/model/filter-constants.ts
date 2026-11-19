import type { ItemFilters, Rarity } from '../types'

export const RARITIES: readonly Rarity[] = ['None', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies', 'Unknown']

export const EMPTY_FILTERS: ItemFilters = { search: '', types: [], rarities: [], categories: [], availabilities: [], sources: [] }
