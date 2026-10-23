import { describe, expect, it } from 'vitest'
import { normalizeItem, type NormalizationIndexes } from './normalize-item'
import type { ProcessedItemEntity } from './raw-types'

const indexes: NormalizationIndexes = {
    itemEntries: new Map(),
    itemTypes: new Map([
        ['m|phb', { abbreviation: 'M', name: 'Melee weapon', source: 'PHB' }],
        ['s|phb', { abbreviation: 'S', name: 'Shield', source: 'PHB' }],
        ['ha|phb', { abbreviation: 'HA', name: 'Heavy armor', source: 'PHB' }],
    ]),
    itemProperties: new Map([['v|phb', { abbreviation: 'V', name: 'Versatile', source: 'PHB', entries: ['First rule.', 'Second rule.'] }]]),
    itemMasteries: new Map([['slow|xphb', { name: 'Slow', source: 'XPHB', entries: ['First mastery rule.', 'Second mastery rule.'] }]]),
    typeAdditionalEntries: new Map(),
}
const base: ProcessedItemEntity = { name: 'Test', source: 'PHB', _catalogOrigin: 'baseitem', _catalogEdition: 'classic' }

describe('complete item sheet normalization', () => {
    it('resolves weapon information and retains every paragraph', () => {
        const item = normalizeItem({ ...base, type: 'M', weapon: true, dmg1: '1d8', dmgType: 'S', dmg2: '1d10', range: '20/60', property: ['V'], mastery: ['Slow'], weaponCategory: 'martial', reqAttune: 'by a wizard', page: 42, entries: ['Intro.', 'Effect.'] }, indexes)
        expect(item.weaponInformation).toEqual(expect.arrayContaining([
            { label: 'Base damage', value: '1d8 slashing' },
            { label: 'Properties', value: 'Versatile (1d10)' },
            { label: 'Range', value: '20/60 ft.' },
            { label: 'Mastery', value: 'Slow' },
        ]))
        expect(item.characteristics).toEqual(expect.arrayContaining(['Intro.', 'Effect.', 'Second rule.', 'Second mastery rule.']))
        expect(item.attunementRequirement).toBe('by a wizard')
        expect(item.sourcePage).toBe(42)
        expect(item.armorInformation).toBeUndefined()
    })

    it('does not manufacture absent information or descriptions', () => {
        const item = normalizeItem(base, indexes)
        expect(item.weaponInformation).toBeUndefined()
        expect(item.armorInformation).toBeUndefined()
        expect(item.characteristics).toEqual([])
        expect(item.attunementRequirement).toBeUndefined()
        expect(item.sourcePage).toBeUndefined()
        const weapon = normalizeItem({ ...base, weapon: true, type: 'M' }, indexes)
        expect(weapon.weaponInformation?.some((entry) => entry.label === 'Range')).toBe(false)
    })

    it('separates armor, shield and magical bonuses', () => {
        const armor = normalizeItem({ ...base, type: 'HA', ac: 16, strength: '13', stealth: true, bonusAc: '+1' }, indexes)
        expect(armor.armorInformation).toEqual(expect.arrayContaining([
            { label: 'Base AC', value: '16' },
            { label: 'Strength requirement', value: '13' },
            { label: 'Stealth', value: 'Disadvantage' },
            { label: 'Magic AC bonus', value: '+1' },
        ]))
        const shield = normalizeItem({ ...base, type: 'S', ac: 2 }, indexes)
        expect(shield.armorInformation).toContainEqual({ label: 'AC bonus', value: '+2' })
        expect(shield.weaponInformation).toBeUndefined()
    })

    it('preserves zero and rejects invalid numeric data', () => {
        const item = normalizeItem({ ...base, weight: 0, value: 0, page: 0 }, indexes)
        expect(item).toMatchObject({ weight: '0 lb', basePriceGp: 0, sourcePage: 0, hasExplicitPrice: true })
        const invalid = normalizeItem({ ...base, page: -1, ac: Infinity, type: 'S' }, indexes)
        expect(invalid.sourcePage).toBeUndefined()
        expect(invalid.armorInformation?.some((entry) => entry.label === 'AC bonus')).toBe(false)
    })
})
