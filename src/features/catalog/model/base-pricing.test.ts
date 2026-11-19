import { describe, expect, it } from 'vitest'
import { craftingEstimate, estimatedBasePriceGp, SPELL_SCROLL_PRICES_GP, spellScrollPriceGp } from './base-pricing'
import { deriveBasePriceGp, withEffectiveRarity } from './items/normalize-item'
import type { ProcessedItemEntity } from './items/raw-types'
import { ITEM_FIXTURES } from '../test/fixtures/items'

describe('automatic base prices', () => {
    it.each(SPELL_SCROLL_PRICES_GP.map((price, level) => ({ price, level })))('prices circle $level in both editions at $price GP', ({ price, level }) => {
        const classic = level === 0 ? 'Cantrip' : `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'} Level`
        for (const [source, suffix] of [['DMG', classic], ['XDMG', level === 0 ? 'Cantrip' : `Level ${level}`]]) {
            const entity: ProcessedItemEntity = { name: `Spell Scroll (${suffix})`, source, value: 999, miscTags: ['CNS'], type: 'SC', rarity: 'rare', _catalogOrigin: 'item', _catalogEdition: 'classic' }
            expect(deriveBasePriceGp(entity, 'Rare')).toBe(price)
            expect(withEffectiveRarity({ ...ITEM_FIXTURES[0], name: entity.name, source, categories: ['Consumable'], hasExplicitPrice: false }, 'Legendary').basePriceGp).toBe(price)
        }
    })

    it('does not apply the scroll table to groups, other scrolls or unrelated sources', () => {
        expect(spellScrollPriceGp({ name: 'Spell Scroll', source: 'DMG' })).toBeNull()
        expect(spellScrollPriceGp({ name: 'Scroll of Protection', source: 'DMG' })).toBeNull()
        expect(spellScrollPriceGp({ name: 'Spell Scroll (Level 1)', source: 'TST' })).toBeNull()
    })

    it('halves only magic consumable rarity estimates and preserves explicit zero', () => {
        expect(estimatedBasePriceGp('Rare', 'Magic', ['Potion', 'Consumable'])).toBe(2000)
        expect(estimatedBasePriceGp('Rare', 'Common', ['Consumable'])).toBe(4000)
        const entity: ProcessedItemEntity = { name: 'Potion', source: 'TST', rarity: 'rare', type: 'P', miscTags: ['CNS'], _catalogOrigin: 'item', _catalogEdition: 'classic' }
        expect(deriveBasePriceGp(entity, 'Rare')).toBe(2000)
        expect(deriveBasePriceGp({ ...entity, value: 10000 }, 'Rare')).toBe(100)
        expect(deriveBasePriceGp({ ...entity, value: 0 }, 'Rare')).toBe(0)
        const item = { ...ITEM_FIXTURES[0], categories: ['Consumable' as const], basePriceGp: 2000, hasExplicitPrice: false }
        const repriced = withEffectiveRarity(item, 'Uncommon')
        expect(repriced.basePriceGp).toBe(200)
        expect(withEffectiveRarity(repriced, 'Uncommon').basePriceGp).toBe(200)
        expect(withEffectiveRarity({ ...item, hasExplicitPrice: true }, 'Legendary').basePriceGp).toBe(2000)
    })
})

describe('crafting estimates', () => {
    it.each([
        [100, 50, 10, 80],
        [19.99, 9.995, 1, 8],
        [9.99, 4.995, 0, 0],
        [0, 0, 0, 0],
    ])('calculates crafting for %s GP', (base, costGp, days, hours) => {
        expect(craftingEstimate(base)).toEqual({ costGp, days, hours })
    })

    it.each([-1, NaN, Infinity])('rejects invalid crafting price %s', (price) => {
        expect(craftingEstimate(price)).toBeNull()
    })
})
