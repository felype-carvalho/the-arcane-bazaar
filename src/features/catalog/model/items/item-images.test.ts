import { describe, expect, it } from 'vitest'
import fluffItems from '../../data/fluff-items.json'
import items from '../../data/items.json'
import base from '../../data/items-base.json'
import variants from '../../data/magicvariants.json'
import { buildCatalog } from './build-catalog'
import type { ItemJsonFiles } from './raw-types'
import type { ItemImageReference } from '../../types'
import { resolveItemImages, type ItemFluffEntry } from './item-images'

describe('item artwork', () => {
    it('matches the exact item source and encodes the remote path', () => {
        const entries = fluffItems.itemFluff as ItemFluffEntry[]
        expect(resolveItemImages(entries, ' Potion of Vitality ', 'xdmg')[0]).toMatchObject({
            src: 'https://5e.tools/img/items/XDMG/Potion%20of%20Vitality.webp',
            credit: 'Conceptopolis',
        })
        expect(resolveItemImages(entries, 'Potion of Vitality', 'DMG')).toEqual([])
    })

    it('preserves image order and resolves explicit copies', () => {
        const entries: ItemFluffEntry[] = [
            { name: 'Original', source: 'ABC', images: [
                { type: 'image', href: { type: 'internal', path: 'decks/ABC/First image.webp' } },
                { type: 'image', href: { type: 'internal', path: 'items/ABC/Second.webp' } },
            ] },
            { name: 'Copy', source: 'XYZ', _copy: { name: 'Original', source: 'ABC' } },
        ]
        expect(resolveItemImages(entries, 'Copy', 'XYZ').map((image) => image.src)).toEqual([
            'https://5e.tools/img/decks/ABC/First%20image.webp',
            'https://5e.tools/img/items/ABC/Second.webp',
        ])
    })

    it('uses a generic variant image for a specific variant without its own image', () => {
        const entries = fluffItems.itemFluff as ItemFluffEntry[]
        const fallback = { name: 'Ascendant Wave-Swept Weapon', source: 'AU' }
        expect(resolveItemImages(entries, 'Ascendant Wave-Swept Longsword', 'AU', fallback)[0]).toMatchObject({
            src: 'https://5e.tools/img/items/AU/Aquatic%20Wave-Swept%20Weapon.webp',
            credit: 'Ina Wong',
        })
        expect(resolveItemImages(entries, 'Ascendant Wave-Swept Longsword', 'AU')).toEqual([])
    })

    it('prefers artwork of the specific variant over the generic fallback', () => {
        const entries: ItemFluffEntry[] = [
            { name: 'Specific Sword', source: 'ABC', images: [{ type: 'image', href: { type: 'internal', path: 'items/ABC/Specific.webp' } }] },
            { name: 'Generic Weapon', source: 'ABC', images: [{ type: 'image', href: { type: 'internal', path: 'items/ABC/Generic.webp' } }] },
        ]
        expect(resolveItemImages(entries, 'Specific Sword', 'ABC', { name: 'Generic Weapon', source: 'ABC' })[0].src)
            .toBe('https://5e.tools/img/items/ABC/Specific.webp')
    })

    it('inherits Enspelled family artwork through every version and compatible base', () => {
        const entries = fluffItems.itemFluff as ItemFluffEntry[]
        const files = { items, base, variants } as unknown as ItemJsonFiles
        const catalog = buildCatalog(files)
        for (const name of ['Enspelled Weapon', 'Enspelled Armor', 'Enspelled Staff']) {
            const family = catalog.find((item) => item.name === name)!
            const expected = resolveItemImages(entries, family.name, family.source)
            expect(expected.length, name).toBeGreaterThan(0)
            expect(family.groupOptions).toHaveLength(9)
            for (const option of family.groupOptions!) {
                const version = option.resolvedItem
                expect(resolveItemImages(entries, version.name, version.source, version.imageFallback), version.id).toEqual(expected)
                for (const baseOption of version.variantOptions ?? []) {
                    const specific = baseOption.resolvedItem
                    expect(resolveItemImages(entries, specific.name, specific.source, specific.imageFallback), specific.id).toEqual(expected)
                }
            }
        }
    })

    it('prefers specific and version artwork before falling back to the group', () => {
        const entries: ItemFluffEntry[] = ['Specific', 'Version', 'Group'].map((name) => ({
            name,
            source: 'ABC',
            images: [{ type: 'image', href: { type: 'internal', path: `items/ABC/${name}.webp` } }],
        }))
        const fallback = { name: 'Version', source: 'ABC', fallback: { name: 'Group', source: 'ABC' } }
        for (let index = 0; index < entries.length; index++) {
            expect(resolveItemImages(entries.slice(index), 'Specific', 'ABC', fallback)[0].src)
                .toBe(`https://5e.tools/img/items/ABC/${entries[index].name}.webp`)
        }
        expect(resolveItemImages(entries, 'Specific', 'OTHER')).toEqual([])
        const cyclic: ItemImageReference = { name: 'Missing', source: 'ABC' }
        cyclic.fallback = cyclic
        expect(resolveItemImages(entries, 'Missing', 'ABC', cyclic)).toEqual([])
    })

    it('ignores missing references, cycles, and invalid image links', () => {
        const entries: ItemFluffEntry[] = [
            { name: 'A', source: 'ABC', _copy: { name: 'B' } },
            { name: 'B', source: 'ABC', _copy: { name: 'A' } },
            { name: 'Invalid', source: 'ABC', images: [{ type: 'image', href: { type: 'internal', path: '../other.webp' } }] },
        ]
        expect(resolveItemImages(entries, 'A', 'ABC')).toEqual([])
        expect(resolveItemImages(entries, 'Missing', 'ABC')).toEqual([])
        expect(resolveItemImages(entries, 'Invalid', 'ABC')).toEqual([])
    })
})
