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
            { label: 'Base Damage', value: '1d8 slashing' },
            { label: 'Properties', value: 'Versatile (1d10)' },
            { label: 'Range', value: '20/60 ft.' },
            { label: 'Mastery', value: 'Slow' },
            { label: 'Weapon Type', value: 'martial · Melee weapon' },
        ]))
        expect(item.characteristics).toEqual(expect.arrayContaining(['Intro.', 'Effect.', 'Second rule.', 'Second mastery rule.']))
        expect(item.characteristics).not.toContain('1d8 slashing damage')
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
        const leather = normalizeItem({ ...base, type: 'LA', ac: 11, armor: true }, indexes)
        expect(leather.armorInformation).toContainEqual({ label: 'Base AC', value: '11 + Dex' })
        const studdedLeather = normalizeItem({ ...base, type: 'LA|XPHB', ac: 12, armor: true }, indexes)
        expect(studdedLeather.armorInformation).toContainEqual({ label: 'Base AC', value: '12 + Dex' })
        const chainShirt = normalizeItem({ ...base, type: 'MA', ac: 13, armor: true }, indexes)
        expect(chainShirt.armorInformation).toContainEqual({ label: 'Base AC', value: 'AC 13 + Dex (max 2)' })
        const armor = normalizeItem({ ...base, type: 'HA', ac: 16, strength: '13', stealth: true, bonusAc: '+1' }, indexes)
        expect(armor.armorInformation).toEqual(expect.arrayContaining([
            { label: 'Base AC', value: '16' },
            { label: 'Strength requirement', value: '13' },
            { label: 'Stealth', value: 'Disadvantage' },
            { label: 'Magic AC bonus', value: '+1' },
        ]))
        expect(armor.characteristics).not.toContain('Armor Class 16')
        expect(armor.characteristics).toEqual(expect.arrayContaining([
            'The wearer has disadvantage on Dexterity (Stealth) checks.',
            'If the wearer has a Strength score lower than 13, their speed is reduced by 10 feet.',
        ]))
        const shield = normalizeItem({ ...base, type: 'S', ac: 2 }, indexes)
        expect(shield.armorInformation).toContainEqual({ label: 'AC bonus', value: '+2' })
        expect(shield.weaponInformation).toBeUndefined()
    })

    it('shows available vehicle specifications without inventing missing values', () => {
        const ship = normalizeItem({
            ...base,
            type: 'SHP',
            vehSpeed: 2.5,
            capCargo: 100,
            capPassenger: 20,
            crew: 20,
            vehAc: 15,
            vehHp: 300,
            vehDmgThresh: 15,
            travelCost: 200,
            shippingCost: 100,
        }, indexes)
        expect(ship.vehicleInformation).toEqual([
            { label: 'Speed', value: '2.5 mph' },
            { label: 'Carrying Capacity', value: '100 tons cargo · 20 passengers' },
            { label: 'Crew', value: '20' },
            { label: 'AC', value: '15' },
            { label: 'HP', value: '300' },
            { label: 'Damage Threshold', value: '15' },
            { label: 'Personal Travel Cost', value: '2 GP per mile per passenger' },
            { label: 'Shipping Cost', value: '1 GP per 100 lb per mile' },
        ])
        const skyship = normalizeItem({ ...base, type: 'AIR', crewMin: 6, crewMax: 10, capPassenger: 30 }, indexes)
        expect(skyship.vehicleInformation).toEqual([
            { label: 'Carrying Capacity', value: '30 passengers' },
            { label: 'Crew', value: '6–10' },
        ])
        expect(normalizeItem({ ...base, type: 'VEH' }, indexes).vehicleInformation).toBeUndefined()
        expect(normalizeItem({ ...base, type: 'M', vehSpeed: 2 }, indexes).vehicleInformation).toBeUndefined()
    })

    it('shows available mount specifications and explicit monster stat block references', () => {
        const camel = normalizeItem({ ...base, type: 'MNT', speed: 50, carryingCapacity: 480 }, indexes)
        expect(camel.mountInformation).toEqual([
            { label: 'Speed', value: '50 ft.' },
            { label: 'Carrying Capacity', value: '480 lb' },
            { label: 'Monster Stat Block', value: 'Test' },
        ])

        const sledDog = normalizeItem({ ...base, type: 'MNT', entries: ['A sled dog uses the {@creature Wolf|XMM} stat block.'] }, indexes)
        expect(sledDog.mountInformation).toEqual([{ label: 'Monster Stat Block', value: 'Wolf' }])
        const olderSledDog = normalizeItem({ ...base, type: 'MNT', entries: ['A sled dog (use the {@creature wolf} stat block in appendix A) costs 50 gp.'] }, indexes)
        expect(olderSledDog.mountInformation).toEqual([{ label: 'Monster Stat Block', value: 'Wolf' }])

        expect(normalizeItem({ ...base, type: 'MNT' }, indexes).mountInformation).toEqual([{ label: 'Monster Stat Block', value: 'Test' }])
        expect(normalizeItem({ ...base, type: 'MNT', speed: -1, carryingCapacity: Infinity, entries: ["An {@creature axe beak}'s splayed toes help it run."] }, indexes).mountInformation).toEqual([{ label: 'Monster Stat Block', value: 'Test' }])
        expect(normalizeItem({ ...base, type: 'M', speed: 50, carryingCapacity: 480 }, indexes).mountInformation).toBeUndefined()
    })

    it('preserves zero and rejects invalid numeric data', () => {
        const item = normalizeItem({ ...base, weight: 0, value: 0, page: 0 }, indexes)
        expect(item).toMatchObject({ weight: '0 lb', basePriceGp: 0, sourcePage: 0, hasExplicitPrice: true })
        const invalid = normalizeItem({ ...base, page: -1, ac: Infinity, type: 'S' }, indexes)
        expect(invalid.sourcePage).toBeUndefined()
        expect(invalid.armorInformation?.some((entry) => entry.label === 'AC bonus')).toBe(false)
    })
})
