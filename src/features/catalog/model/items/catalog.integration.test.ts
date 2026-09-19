import { beforeAll, describe, expect, it } from 'vitest'
import itemsJson from '../../data/items.json'
import itemsBaseJson from '../../data/items-base.json'
import magicVariantsJson from '../../data/magicvariants.json'
import { buildCatalog, type CatalogDiagnostics } from './build-catalog'
import type { ItemJsonFiles } from './raw-types'
import { CATEGORIES } from './categories'

describe('catalog integration with the real corpus', () => {
    it('builds direct, base, group, and grouped generic-variant products without mutating its sources', () => {
        const files = { items: itemsJson, base: itemsBaseJson, variants: magicVariantsJson } as unknown as ItemJsonFiles
        const before = JSON.stringify(files)
        let diagnostics: CatalogDiagnostics | undefined
        const catalog = buildCatalog(files, { includeGenericVariantsInDiagnostics: true, onDiagnostics: (value) => { diagnostics = value } })

        expect(JSON.stringify(files)).toBe(before)
        expect(catalog.length).toBe(itemsJson.item.length + itemsBaseJson.baseitem.length + itemsJson.itemGroup.length + magicVariantsJson.magicvariant.length - diagnostics!.groupedMembers)
        expect(new Set(catalog.map((item) => item.id)).size).toBe(catalog.length)
        expect(new Set(catalog.map((item) => item.origin))).toEqual(new Set(['item', 'itemGroup', 'baseitem', 'genericVariant']))
        expect(catalog.some((item) => item.origin === 'specificVariant')).toBe(false)
        expect(catalog.every((item) => item.id && item.name && item.source && item.category && Array.isArray(item.tags) && Array.isArray(item.properties))).toBe(true)
        expect(catalog.some((item) => item.description.includes('{#itemEntry'))).toBe(false)
        const inlineRemainders = catalog.flatMap((item) => [item.description, ...item.properties].filter((line) => line.includes('{@')).map((line) => `${item.name}|${item.source}: ${line}`))
        expect(inlineRemainders).toEqual([])
        expect([...new Set(catalog.map((item) => item.category))]).toEqual(expect.arrayContaining(['Weapon', 'Armor', 'Potion', 'Scroll', 'Ring', 'Tool', 'Vehicle', 'Tattoo', 'Other']))
        expect(diagnostics?.specificVariants).toBeGreaterThan(3000)
        expect(diagnostics?.genericVariantTemplates).toBe(magicVariantsJson.magicvariant.length)
        expect(diagnostics!.byOrigin.genericVariant).toBeLessThan(magicVariantsJson.magicvariant.length)
        expect(diagnostics?.idCollisions).toEqual([])
        expect(diagnostics?.unresolvedReferences).toEqual([])
        const allItems = [...catalog, ...catalog.flatMap((item) => item.variantOptions?.map((option) => option.resolvedItem) ?? [])]
        expect(allItems.every((item) => item.categories[0] === item.category
            && new Set(item.categories).size === item.categories.length
            && item.categories.every((category) => CATEGORIES.includes(category)))).toBe(true)
        expect(catalog.some((item) => item.categories.includes('Wondrous'))).toBe(true)
        expect(Object.values(diagnostics!.byCategoryMembership).reduce((sum, count) => sum + count, 0)).toBe(catalog.reduce((sum, item) => sum + item.categories.length, 0))

        const adamantine2024 = catalog.filter((item) => item.name === 'Adamantine Armor' && item.source === 'XDMG')
        expect(adamantine2024).toHaveLength(1)
        expect(adamantine2024[0].origin).toBe('genericVariant')
        expect(adamantine2024[0].category).toBe('Armor')
        expect(adamantine2024[0].basePriceGp).toBeNull()
        expect(adamantine2024[0].variantOptions?.map((option) => option.baseName)).toEqual([
            'Breastplate', 'Chain Mail', 'Chain Shirt', 'Half Plate Armor', 'Plate Armor', 'Ring Mail', 'Scale Mail', 'Splint Armor',
        ])
        expect(adamantine2024[0].variantOptions?.some((option) => option.baseName === 'Hide Armor')).toBe(false)
        const breastplate = adamantine2024[0].variantOptions?.find((option) => option.baseName === 'Breastplate')
        expect(breastplate?.baseSource).toBe('XPHB')
        expect(breastplate?.basePriceGp).toBe(400)
        expect(breastplate?.effectivePriceGp).toBe(800)

        const adamantineClassic = catalog.filter((item) => item.name === 'Adamantine Armor' && item.source === 'DMG')
        expect(adamantineClassic).toHaveLength(1)
        expect(adamantineClassic[0].variantOptions).toHaveLength(9)
    })
})


describe('magic groups in the real corpus', () => {
    let catalog: ReturnType<typeof buildCatalog>
    beforeAll(() => { catalog = buildCatalog({ items: itemsJson, base: itemsBaseJson, variants: magicVariantsJson } as unknown as ItemJsonFiles) })

    it.each([
        ['Spellwrought Tattoo', 'TCE', ['Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Rare']],
        ['Staff of Skulls', 'AU', ['Common', 'Uncommon', 'Rare', 'Very Rare']],
        ["Dragon's Wrath Weapon", 'FTD', ['Uncommon', 'Rare', 'Very Rare', 'Legendary']],
    ])('consolidates %s and preserves member rarities', (name, source, rarities) => {
        const matches = catalog.filter((item) => item.name === name && item.source === source)
        expect(matches).toHaveLength(1)
        const group = matches[0]
        expect(group.origin).toBe('itemGroup')
        expect(group.groupOptions?.map((option) => option.resolvedItem.rarity)).toEqual(rarities)
        for (const option of group.groupOptions ?? []) {
            expect(option.resolvedItem.description.length).toBeGreaterThan(0)
            if (option.kind === 'member') expect(catalog.some((item) => item.id === option.resolvedItem.id)).toBe(false)
        }
    })

    it('preserves tattoo order and infers the initial skull staff stage', () => {
        const tattoo = catalog.find((item) => item.name === 'Spellwrought Tattoo' && item.source === 'TCE')!
        expect(tattoo.groupOptions?.map((option) => option.label)).toEqual(['Spellwrought Tattoo (Cantrip)', 'Spellwrought Tattoo (1st Level)', 'Spellwrought Tattoo (2nd Level)', 'Spellwrought Tattoo (3rd Level)', 'Spellwrought Tattoo (4th Level)', 'Spellwrought Tattoo (5th Level)'])
        const staff = catalog.find((item) => item.name === 'Staff of Skulls' && item.source === 'AU')!
        expect(staff.groupOptions?.[0]).toMatchObject({ kind: 'inferredInitialStage', rarityOrigin: 'inferred', resolvedItem: { basePriceGp: 100, availability: 'Available' } })
        expect(staff.groupOptions?.[3].resolvedItem.properties.length).toBeGreaterThan(staff.groupOptions![1].resolvedItem.properties.length)
    })

    it('retains the four dragon variants and their combined prices', () => {
        const group = catalog.find((item) => item.name === "Dragon's Wrath Weapon" && item.source === 'FTD')!
        expect(group.groupOptions?.map((option) => option.label)).toEqual(["Slumbering Dragon's Wrath Weapon", "Stirring Dragon's Wrath Weapon", "Wakened Dragon's Wrath Weapon", "Ascendant Dragon's Wrath Weapon"])
        for (const option of group.groupOptions ?? []) {
            expect(option.resolvedItem.origin).toBe('genericVariant')
            expect(option.resolvedItem.variantOptions!.length).toBeGreaterThan(0)
        }
        const base = group.groupOptions![2].resolvedItem.variantOptions!.find((option) => option.baseName === 'Longsword')!
        expect(base.resolvedItem.name).toBe("Wakened Dragon's Wrath Longsword")
        expect(base.resolvedItem.rarity).toBe('Very Rare')
        expect(base.resolvedItem.source).toBe('FTD')
        expect(base.effectivePriceGp).toBe(base.basePriceGp! + base.variantPriceGp!)
    })
})


it('resolves every raw group reference by name and source in the current corpus', () => {
    const keys = new Set([
        ...itemsJson.item.map((item) => item.name.toLowerCase() + '|' + item.source.toLowerCase()),
        ...itemsBaseJson.baseitem.map((item) => item.name.toLowerCase() + '|' + item.source.toLowerCase()),
        ...(magicVariantsJson as unknown as ItemJsonFiles['variants']).magicvariant.map((variant) => variant.name.toLowerCase() + '|' + String(variant.source ?? variant.inherits?.source).toLowerCase()),
    ])
    const references = itemsJson.itemGroup.flatMap((group) => group.items)
    expect(references).toHaveLength(669)
    const unresolved = itemsJson.itemGroup.flatMap((group) => group.items.filter((uid) => {
        const [name, source] = uid.toLowerCase().split('|')
        if (keys.has(name + '|' + (source ?? group.source.toLowerCase()))) return false
        return Boolean(source) || [...keys].filter((key) => key.startsWith(name + '|')).length !== 1
    }))
    expect(unresolved).toEqual([])
})
