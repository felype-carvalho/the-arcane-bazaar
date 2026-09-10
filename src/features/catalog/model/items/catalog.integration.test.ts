import { describe, expect, it } from 'vitest'
import itemsJson from '../../data/items.json'
import itemsBaseJson from '../../data/items-base.json'
import magicVariantsJson from '../../data/magicvariants.json'
import { buildCatalog, type CatalogDiagnostics } from './build-catalog'
import type { ItemJsonFiles } from './raw-types'

describe('catalog integration with the real corpus', () => {
  it('builds direct, base, group, and grouped generic-variant products without mutating its sources', () => {
    const files = { items: itemsJson, base: itemsBaseJson, variants: magicVariantsJson } as unknown as ItemJsonFiles
    const before = JSON.stringify(files)
    let diagnostics: CatalogDiagnostics | undefined
    const catalog = buildCatalog(files, { includeGenericVariantsInDiagnostics: true, onDiagnostics: (value) => { diagnostics = value } })

    expect(JSON.stringify(files)).toBe(before)
    expect(catalog.length).toBeGreaterThan(itemsJson.item.length + itemsBaseJson.baseitem.length)
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
    expect(diagnostics?.byOrigin.genericVariant).toBe(magicVariantsJson.magicvariant.length)
    expect(diagnostics?.idCollisions).toEqual([])
    expect(diagnostics?.unresolvedReferences).toEqual([])

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
