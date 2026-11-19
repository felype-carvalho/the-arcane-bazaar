import { describe, expect, it } from 'vitest'
import { buildCatalog, type CatalogDiagnostics } from './build-catalog'
import type { ItemJsonFiles } from './raw-types'

function createFiles(): ItemJsonFiles {
    return {
        items: { item: [{ name: 'Cloak', source: 'TST', wondrous: true, miscTags: ['CNS'] }], itemGroup: [] },
        base: {
            baseitem: [
                { name: 'Blade', source: 'TST', weapon: true, type: 'M' },
                { name: 'Mail', source: 'TST', armor: true, type: 'HA' },
            ],
            itemType: [], itemProperty: [], itemEntry: [], itemMastery: [],
        },
        variants: {
            magicvariant: [
                { name: 'Enchanted Equipment', requires: [{ weapon: true }, { armor: true }], inherits: { source: 'TST', wondrous: true } },
                { name: 'Enchanted Blade', requires: [{ weapon: true }], inherits: { source: 'TST', wondrous: true } },
                { name: 'Unavailable Relic', requires: [{ missing: true }], inherits: { source: 'TST', wondrous: true } },
            ],
        },
    }
}

describe('category membership in catalog construction', () => {
    it('halves only the rarity portion of consumable variants and preserves explicit pricing rules', () => {
        const files = createFiles()
        files.base.baseitem = [{ name: 'Blade', source: 'TST', weapon: true, type: 'M', value: 1500 }]
        files.variants.magicvariant = [
            { name: 'Consumable Blade', requires: [{ weapon: true }], inherits: { source: 'TST', rarity: 'rare', miscTags: ['CNS'] } },
            { name: 'Explicit Blade', requires: [{ weapon: true }], inherits: { source: 'TST', rarity: 'rare', miscTags: ['CNS'], value: 10000 } },
            { name: 'Expression Blade', requires: [{ weapon: true }], inherits: { source: 'TST', rarity: 'rare', miscTags: ['CNS'], valueExpression: '[[baseItem.value]] + 50000' } },
            { name: 'Multiplier Blade', requires: [{ weapon: true }], inherits: { source: 'TST', rarity: 'rare', miscTags: ['CNS'], valueMult: 4 } },
        ]
        const catalog = buildCatalog(files)
        for (const [name, price, origin] of [
            ['Consumable Blade', 2015, 'rarity'],
            ['Explicit Blade', 115, 'explicit'],
            ['Expression Blade', 515, 'explicit'],
            ['Multiplier Blade', 60, 'explicit'],
        ] as const) {
            const option = catalog.find((item) => item.name === name)!.variantOptions![0]
            expect(option.basePriceGp).toBe(15)
            expect(option.effectivePriceGp).toBe(price)
            expect(option.resolvedItem).toMatchObject({ basePriceGp: price, basePriceOrigin: origin })
        }
    })

    it('aggregates heterogeneous families without transferring memberships to concrete options', () => {
        const family = buildCatalog(createFiles()).find((item) => item.name === 'Enchanted Equipment')!
        expect(family.category).toBe('Other')
        expect(family.categories).toEqual(['Other', 'Armor', 'Weapon', 'Wondrous'])
        expect(family.variantOptions?.map((option) => option.resolvedItem.categories)).toEqual([
            ['Weapon', 'Wondrous'], ['Armor', 'Wondrous'],
        ])
    })

    it('preserves homogeneous primary selection and handles families without options', () => {
        const catalog = buildCatalog(createFiles())
        expect(catalog.find((item) => item.name === 'Enchanted Blade')).toMatchObject({ category: 'Weapon', categories: ['Weapon', 'Other', 'Wondrous'] })
        expect(catalog.find((item) => item.name === 'Unavailable Relic')).toMatchObject({ category: 'Other', categories: ['Other', 'Wondrous'], variantOptions: [] })
    })

    it('retains the generic variant identity on resolved specific items for artwork lookup', () => {
        const family = buildCatalog(createFiles()).find((item) => item.name === 'Enchanted Blade')!
        expect(family.variantOptions?.[0].resolvedItem).toMatchObject({
            origin: 'specificVariant',
            imageFallback: { name: 'Enchanted Blade', source: 'TST' },
        })
    })

    it('counts primary categories separately from all memberships', () => {
        let diagnostics: CatalogDiagnostics | undefined
        const catalog = buildCatalog(createFiles(), { onDiagnostics: (value) => { diagnostics = value } })
        expect(Object.values(diagnostics!.byCategory).reduce((sum, count) => sum + count, 0)).toBe(catalog.length)
        expect(diagnostics!.byCategoryMembership.Wondrous).toBe(4)
        expect(diagnostics!.byCategoryMembership.Weapon).toBe(3)
        expect(diagnostics!.otherPercent).toBeCloseTo(100 * 2 / catalog.length)
        expect(catalog.find((item) => item.name === 'Cloak')?.categories).toEqual(['Apparel', 'Consumable', 'Wondrous'])
    })
})
