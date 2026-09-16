import { describe, expect, it } from 'vitest'
import { resolveCategories } from './categories'

describe('multiple item categories', () => {
    it('keeps the primary category and accumulates structured evidence in canonical order', () => {
        expect(resolveCategories({ name: 'Staff', staff: true, weapon: true, type: 'M|XPHB', wondrous: true, miscTags: ['CNS'] }))
            .toEqual(['Staff / Rod', 'Consumable', 'Weapon', 'Wondrous'])
        expect(resolveCategories({ name: 'Poison', poison: true, type: 'P' })).toEqual(['Poison', 'Potion'])
        expect(resolveCategories({ name: 'Cloak', wondrous: true, miscTags: ['CNS'] })).toEqual(['Apparel', 'Consumable', 'Wondrous'])
    })

    it('keeps overrides while allowing explicit additional categories', () => {
        expect(resolveCategories({ name: 'Deck of Many Things', source: 'DMG', wondrous: true })).toEqual(['Other', 'Wondrous'])
        expect(resolveCategories({ name: 'Portable Hole', source: 'XDMG', wondrous: true })).toEqual(['Bag/Container', 'Wondrous'])
    })

    it('does not infer additional categories from incidental text or non-boolean flags', () => {
        expect(resolveCategories({ name: 'Ring', type: 'RG', wondrous: false }, 'A gem in a bottle that summons a beast and is destroyed.')).toEqual(['Ring'])
        expect(resolveCategories({ name: 'Relic', tattoo: false, poison: false, staff: false, weapon: false, armor: false, wondrous: 'true' })).toEqual(['Other'])
        expect(resolveCategories({ name: 'Amulet of Summoning' }, 'Summons a beast.')).toEqual(['Amulet'])
    })
})
