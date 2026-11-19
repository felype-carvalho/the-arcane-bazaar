import type { Category, Item, Rarity } from '../types'

export const RARITY_BASE_PRICES_GP: Partial<Record<Rarity, number>> = {
    Common: 100,
    Uncommon: 400,
    Rare: 4_000,
    'Very Rare': 40_000,
    Legendary: 200_000,
}

export const SPELL_SCROLL_PRICES_GP = [30, 50, 200, 300, 2_000, 3_000, 20_000, 25_000, 30_000, 100_000] as const

export function spellScrollPriceGp(item: Pick<Item, 'name' | 'source'>): number | null {
    if (!['DMG', 'XDMG'].includes(item.source.toUpperCase())) return null
    const match = /^Spell Scroll \((Cantrip|Level ([1-9])|([1-9])(?:st|nd|rd|th) Level)\)$/i.exec(item.name)
    if (!match) return null
    const level = match[1].toLowerCase() === 'cantrip' ? 0 : Number(match[2] ?? match[3])
    return SPELL_SCROLL_PRICES_GP[level]
}

export function estimatedBasePriceGp(rarity: Rarity, type: Item['type'], categories: readonly Category[]): number | null {
    const price = RARITY_BASE_PRICES_GP[rarity]
    return price == null ? null : price * (type === 'Magic' && categories.includes('Consumable') ? 0.5 : 1)
}

export function craftingEstimate(basePriceGp: number): { costGp: number; days: number; hours: number } | null {
    if (!Number.isFinite(basePriceGp) || basePriceGp < 0) return null
    const days = Math.floor(basePriceGp / 10)
    return { costGp: basePriceGp / 2, days, hours: days * 8 }
}
