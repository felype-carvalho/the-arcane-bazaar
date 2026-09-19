import { describe, expect, it } from 'vitest'
import { buildCatalog, type CatalogDiagnostics } from './build-catalog'
import type { ItemJsonFiles, RawItemEntity } from './raw-types'

function fixture(groups: RawItemEntity[], members: RawItemEntity[]): ItemJsonFiles {
    return {
        items: { item: members, itemGroup: groups },
        base: { baseitem: [], itemType: [], itemProperty: [{ abbreviation: 'Evo', source: 'TEST', template: 'Evolving Item' }], itemEntry: [], itemMastery: [] },
        variants: { magicvariant: [] },
    }
}

describe('item group construction', () => {
    it('resolves exact identities, default sources and unique fallback in editorial order without mutation', () => {
        const files = fixture([
            { name: 'Group', source: 'A', rarity: 'varies', items: ['Second', 'First|B', 'Unique', 'Missing|A', 'First|C', ' ', 'First|B|invalid'] },
            { name: 'Other group', source: 'A', rarity: 'varies', items: ['First|B'] },
        ], [
            { name: 'First', source: 'B', rarity: 'rare', wondrous: true },
            { name: 'First', source: 'A', rarity: 'common' },
            { name: 'Second', source: 'A', rarity: 'uncommon', weapon: true },
            { name: 'Unique', source: 'B', rarity: 'rare' },
        ])
        const before = structuredClone(files)
        let diagnostics: CatalogDiagnostics | undefined
        const catalog = buildCatalog(files, { onDiagnostics: (value) => { diagnostics = value } })
        const group = catalog.find((item) => item.name === 'Group')!
        expect(group.groupOptions?.map((option) => option.label)).toEqual(['Second', 'First', 'Unique'])
        expect(group.availableRarities).toEqual(['Uncommon', 'Rare'])
        expect(group.tags).toContain('second')
        expect(group.categories).toContain('Weapon')
        expect(catalog.some((item) => item.name === 'First' && item.source === 'A')).toBe(true)
        expect(diagnostics?.groupedMembers).toBe(3)
        expect(diagnostics?.unresolvedReferences).toHaveLength(4)
        expect(group.groupOptions?.[1].id).not.toBe(catalog.find((item) => item.name === 'Other group')?.groupOptions?.[0].id)
        expect(files).toEqual(before)
        expect(buildCatalog(files)).toEqual(catalog)
    })

    it('inherits fixed rarity and preserves explicit prices, while ordinary varying groups stay unknown', () => {
        const files = fixture([
            { name: 'Fixed', source: 'A', rarity: 'rare', items: ['Priced', 'Unpriced'] },
            { name: 'Variable', source: 'A', rarity: 'varies', items: ['Unpriced'] },
        ], [{ name: 'Priced', source: 'A', value: 12300 }, { name: 'Unpriced', source: 'A' }])
        const catalog = buildCatalog(files)
        const options = catalog.find((item) => item.name === 'Fixed')!.groupOptions!
        expect(options[0]).toMatchObject({ rarityOrigin: 'inherited', resolvedItem: { rarity: 'Rare', basePriceGp: 123, availability: 'Limited' } })
        expect(options[1].resolvedItem.basePriceGp).toBe(4000)
        expect(catalog.find((item) => item.name === 'Variable')!.groupOptions![0]).toMatchObject({ rarityOrigin: 'unknown', resolvedItem: { rarity: 'Unknown', basePriceGp: null } })
    })

    it.each([['uncommon', 'Common', 'inferred'], ['common', 'Unknown', 'unknown'], ['unknown', 'Unknown', 'unknown']])('infers an initial stage safely from %s', (memberRarity, expected, origin) => {
        const files = fixture([{ name: 'Evolving', source: 'A', rarity: 'varies', property: ['Evo|TEST'], items: ['Stage'] }], [{ name: 'Stage', source: 'A', rarity: memberRarity }])
        let diagnostics: CatalogDiagnostics | undefined
        const group = buildCatalog(files, { onDiagnostics: (value) => { diagnostics = value } })[0]
        expect(group.groupOptions?.[0]).toMatchObject({ label: 'Initial', kind: 'inferredInitialStage', rarityOrigin: origin, resolvedItem: { rarity: expected } })
        expect(group.groupOptions?.[0].resolvedItem.groupOptions).toBeUndefined()
        expect(diagnostics?.unknownEvolutionStages).toHaveLength(origin === 'unknown' ? 1 : 0)
    })

    it('reports empty and malformed groups and preserves mundane members and ambiguous references', () => {
        const files = fixture([
            { name: 'Empty', source: 'A', rarity: 'varies', items: ['Shared'] },
            { name: 'Mundane', source: 'A', rarity: 'none', items: ['Shared|B'] },
            { name: 'Malformed', source: 'A', rarity: 'varies', items: [42] as unknown as string[] },
        ], [{ name: 'Shared', source: 'B' }, { name: 'Shared', source: 'C' }])
        let diagnostics: CatalogDiagnostics | undefined
        const catalog = buildCatalog(files, { onDiagnostics: (value) => { diagnostics = value } })
        expect(catalog).toHaveLength(5)
        expect(diagnostics?.groupsWithoutOptions).toEqual(['Empty|A', 'Malformed|A'])
        expect(diagnostics?.unresolvedReferences).toHaveLength(2)
        expect(catalog.find((item) => item.name === 'Mundane')?.groupOptions).toBeUndefined()
    })

    it('resolves base items and generic variants while retaining their compatible bases', () => {
        const files = fixture([{ name: 'Equipment', source: 'A', rarity: 'varies', items: ['Blade', 'Enchanted'] }], [])
        files.base.baseitem.push({ name: 'Blade', source: 'A', weapon: true, value: 1500 })
        files.variants.magicvariant.push({ name: 'Enchanted', requires: [{ weapon: true }], inherits: { source: 'A', rarity: 'rare' } })
        const catalog = buildCatalog(files)
        expect(catalog).toHaveLength(1)
        expect(catalog[0].groupOptions?.map((option) => option.resolvedItem.origin)).toEqual(['baseitem', 'genericVariant'])
        expect(catalog[0].groupOptions?.[1].resolvedItem.variantOptions).toHaveLength(1)
    })

    it('recalculates inherited generic and specific rarity with the existing combined-price rules', () => {
        const files = fixture([{ name: 'Equipment', source: 'A', rarity: 'rare', items: ['Enchanted'] }], [])
        files.base.baseitem.push({ name: 'Blade', source: 'A', weapon: true, value: 1500 })
        files.variants.magicvariant.push({ name: 'Enchanted', requires: [{ weapon: true }], inherits: { source: 'A' } })
        const group = buildCatalog(files).find((item) => item.name === 'Equipment')!
        const member = group.groupOptions![0]
        expect(member.rarityOrigin).toBe('inherited')
        expect(member.resolvedItem).toMatchObject({ rarity: 'Rare', variantPriceGp: 4000, basePriceGp: null })
        expect(member.resolvedItem.variantOptions?.[0]).toMatchObject({ effectivePriceGp: 4015, resolvedItem: { rarity: 'Rare', basePriceGp: 4015, availability: 'Limited' } })
    })
})
