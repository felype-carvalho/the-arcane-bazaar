import { beforeAll, describe, expect, it } from 'vitest'
import itemsJson from '../../data/items.json'
import itemsBaseJson from '../../data/items-base.json'
import magicVariantsJson from '../../data/magicvariants.json'
import { buildCatalog, type CatalogDiagnostics } from './build-catalog'
import type { ItemJsonFiles } from './raw-types'
import { CATEGORIES } from './categories'
import { EMPTY_FILTERS, filterAndSortItems, getAvailableFilterOptions } from '../filtering'

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
        const hoopak = catalog.find((item) => item.name === 'Hoopak' && item.source === 'DSotDQ')
        expect(hoopak?.weaponInformation).toContainEqual({ label: 'Properties', value: 'Ammunition (Sling Bullet), Finesse, Special, Two-Handed' })
        for (const source of ['PHB', 'XPHB']) {
            const heavyCrossbow = catalog.find((item) => item.name === 'Heavy Crossbow' && item.source === source)
            expect(heavyCrossbow?.weaponInformation).toContainEqual({ label: 'Properties', value: 'Ammunition (Bolt), Heavy, Loading, Two-Handed' })
            const splintArmor = catalog.find((item) => item.name === 'Splint Armor' && item.source === source)
            expect(splintArmor?.characteristics).toEqual(expect.arrayContaining([
                'The wearer has disadvantage on Dexterity (Stealth) checks.',
                'If the wearer has a Strength score lower than 15, their speed is reduced by 10 feet.',
            ]))
            const studdedLeather = catalog.find((item) => item.name === 'Studded Leather Armor' && item.source === source)
            expect(studdedLeather?.armorInformation).toContainEqual({ label: 'Base AC', value: '12 + Dex' })
        }
        const fungalArmor = catalog.find((item) => item.name === 'Armor of Fungal Spores')
        const fungalChainShirt = fungalArmor?.variantOptions?.find((option) => option.resolvedItem.name === 'Chain Shirt of Fungal Spores')
        expect(fungalChainShirt?.resolvedItem.armorInformation).toContainEqual({ label: 'Base AC', value: 'AC 13 + Dex (max 2)' })
        const skyship = catalog.find((item) => item.name === 'Skyship' && item.source === 'EGW')
        expect(skyship?.vehicleInformation).toEqual(expect.arrayContaining([
            { label: 'Speed', value: '10 mph' },
            { label: 'Carrying Capacity', value: '10 tons cargo · 30 passengers' },
            { label: 'Crew', value: '6–10' },
            { label: 'Personal Travel Cost', value: '2 GP per mile per passenger' },
            { label: 'Shipping Cost', value: '1 GP per 100 lb per mile' },
        ]))
        expect(catalog.find((item) => item.name === 'Carriage' && item.source === 'PHB')?.vehicleInformation).toBeUndefined()
        expect(catalog.find((item) => item.name === 'Camel' && item.source === 'PHB')?.mountInformation).toEqual([
            { label: 'Speed', value: '50 ft.' },
            { label: 'Carrying Capacity', value: '480 lb' },
            { label: 'Monster Stat Block', value: 'Camel' },
        ])
        expect(catalog.find((item) => item.name === 'Sled Dog' && item.source === 'FRHoF')?.mountInformation).toEqual([
            { label: 'Monster Stat Block', value: 'Wolf' },
        ])
        expect(catalog.find((item) => item.name === 'Axe Beak' && item.source === 'IDRotF')?.mountInformation).toEqual([
            { label: 'Monster Stat Block', value: 'Axe Beak' },
        ])
        const lycanthropeBlood = catalog.find((item) => item.name === 'Blood of the Lycanthrope' && item.source === 'IMR')
        expect(lycanthropeBlood?.descriptionBlocks).toEqual(expect.arrayContaining([
            { type: 'table', caption: undefined, columns: ['d6', 'Lycanthropy'], rows: [['1-3', 'Wererat'], ['4-5', 'Werewolf'], ['6', 'Wereboar']] },
        ]))
        for (const source of ['PHB', 'XPHB']) {
            for (const [name, classes] of [
                ['Arcane Focus', 'Sorcerer, Warlock, Wizard'],
                ['Druidic Focus', 'Druid, Ranger'],
                ['Holy Symbol', 'Cleric, Paladin'],
            ]) {
                const focus = catalog.find((item) => item.name === name && item.source === source)
                expect(focus?.spellcastingFocusInformation).toEqual([{ label: 'Spellcasting Focus Requirement', value: classes }])
                expect(focus?.characteristics?.[0]).toContain('spellcasting focus')
            }
        }
        expect(catalog.find((item) => item.name === 'Crystal' && item.source === 'PHB')?.spellcastingFocusInformation).toEqual([
            { label: 'Spellcasting Focus Requirement', value: 'Sorcerer, Warlock, Wizard' },
        ])
        for (const name of ['Amulet', 'Emblem', 'Reliquary']) {
            const focus = catalog.find((item) => item.name === name && item.source === 'XPHB')
            expect(focus?.characteristics?.[0]).toContain('channel divine magic')
            expect(focus?.characteristics?.[1]).toContain(`For ${name === 'Amulet' || name === 'Emblem' ? 'an' : 'a'} ${name}`)
        }
        expect(catalog.find((item) => item.name === 'Sprig of Mistletoe' && item.source === 'XPHB')?.spellcastingFocusInformation).toEqual([
            { label: 'Spellcasting Focus Requirement', value: 'Druid, Ranger' },
        ])
        const dragonFocus = catalog.find((item) => item.name === 'Dragon-Touched Focus' && item.source === 'FTD')
        expect(dragonFocus?.spellcastingFocusInformation).toEqual([{ label: 'Spellcasting Focus Requirement', value: 'Any Spellcaster' }])
        expect(dragonFocus?.groupOptions?.map((option) => option.resolvedItem.spellcastingFocusInformation)).toEqual([
            [{ label: 'Spellcasting Focus Requirement', value: 'Any Spellcaster' }],
            [{ label: 'Spellcasting Focus Requirement', value: 'Any Spellcaster' }],
            [{ label: 'Spellcasting Focus Requirement', value: 'Any Spellcaster' }],
            [{ label: 'Spellcasting Focus Requirement', value: 'Any Spellcaster' }],
        ])
        expect(catalog.find((item) => item.name === 'Ruby Weave Gem' && item.source === 'FTD')?.spellcastingFocusInformation).toEqual([{ label: 'Spellcasting Focus Requirement', value: 'Any Spellcaster' }])
        expect(catalog.find((item) => item.name === 'Ruby of the War Mage' && item.source === 'XDMG')?.spellcastingFocusInformation).toEqual([{ label: 'Spellcasting Focus Requirement', value: 'Any Spellcaster' }])
        expect(catalog.find((item) => item.name === 'Mizzium Apparatus' && item.source === 'GGR')?.spellcastingFocusInformation).toEqual([{ label: 'Spellcasting Focus Requirement', value: 'Sorcerer, Warlock, Wizard' }])
        const instruments = catalog.filter((item) => item.categories.includes('Instrument'))
        expect(instruments.length).toBeGreaterThan(0)
        expect(instruments.filter((item) => item.spellcastingFocusInformation?.[0]?.value !== 'Bard').map((item) => `${item.name}|${item.source}|${item.category}`)).toEqual([])
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
        const cursedItems = catalog.filter((item) => item.categories.includes('Cursed'))
        expect(cursedItems.length).toBeGreaterThan(0)
        expect(cursedItems.every((item) => item.type === 'Magic')).toBe(true)
        const armorOfVulnerability = catalog.filter((item) => item.name === 'Armor of Vulnerability' && ['DMG', 'XDMG'].includes(item.source))
        expect(armorOfVulnerability).toHaveLength(2)
        expect(armorOfVulnerability.every((item) => item.categories.includes('Cursed'))).toBe(true)
        expect(getAvailableFilterOptions(catalog, 'Magic').categories).toContain('Cursed')
        expect(filterAndSortItems(catalog, { ...EMPTY_FILTERS, types: ['Magic'], categories: ['Cursed'] }, 'name', 'asc'))
            .toEqual(expect.arrayContaining(armorOfVulnerability))
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


it('resolves every raw group reference by name and source, including marked generic variants', () => {
    const variants = (magicVariantsJson as unknown as ItemJsonFiles['variants']).magicvariant
    const keys = new Set([
        ...itemsJson.item.map((item) => item.name.toLowerCase() + '|' + item.source.toLowerCase()),
        ...itemsBaseJson.baseitem.map((item) => item.name.toLowerCase() + '|' + item.source.toLowerCase()),
        ...variants.map((variant) => variant.name.toLowerCase() + '|' + String(variant.source ?? variant.inherits?.source).toLowerCase()),
    ])
    const aliasCounts = new Map<string, number>()
    for (const variant of variants) {
        if (!variant.name.endsWith(' (*)')) continue
        const alias = `${variant.name.slice(0, -4).toLowerCase()}|${String(variant.source ?? variant.inherits?.source).toLowerCase()}`
        aliasCounts.set(alias, (aliasCounts.get(alias) ?? 0) + 1)
    }
    const references = itemsJson.itemGroup.flatMap((group) => group.items)
    expect(references).toHaveLength(669)
    const unresolved = itemsJson.itemGroup.flatMap((group) => group.items.filter((uid) => {
        const [name, source] = uid.toLowerCase().split('|')
        if (keys.has(name + '|' + (source ?? group.source.toLowerCase()))) return false
        if (aliasCounts.get(name + '|' + (source ?? group.source.toLowerCase())) === 1) return false
        return Boolean(source) || [...keys].filter((key) => key.startsWith(name + '|')).length !== 1
    }))
    expect(unresolved).toEqual([])
})
