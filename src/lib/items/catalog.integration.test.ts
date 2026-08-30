import { describe, expect, it } from 'vitest'
import itemsJson from '../../data/items.json'
import itemsBaseJson from '../../data/items-base.json'
import magicVariantsJson from '../../data/magicvariants.json'
import { buildCatalog, type CatalogDiagnostics } from './build-catalog'
import type { ItemJsonFiles } from './raw-types'

describe('catalog integration with the real corpus', () => {
  it('builds valid direct, base, group, and specific-variant products without mutating its sources', () => {
    const files = { items: itemsJson, base: itemsBaseJson, variants: magicVariantsJson } as unknown as ItemJsonFiles
    const before = JSON.stringify(files)
    let diagnostics: CatalogDiagnostics | undefined
    const catalog = buildCatalog(files, { includeGenericVariantsInDiagnostics: true, onDiagnostics: (value) => { diagnostics = value } })

    expect(JSON.stringify(files)).toBe(before)
    expect(catalog.length).toBeGreaterThan(itemsJson.item.length + itemsBaseJson.baseitem.length)
    expect(new Set(catalog.map((item) => item.id)).size).toBe(catalog.length)
    expect(new Set(catalog.map((item) => item.origin))).toEqual(new Set(['item', 'itemGroup', 'baseitem', 'specificVariant']))
    expect(catalog.every((item) => item.id && item.name && item.source && item.category && Array.isArray(item.tags) && Array.isArray(item.properties))).toBe(true)
    expect(catalog.some((item) => item.description.includes('{#itemEntry'))).toBe(false)
    const inlineRemainders = catalog.flatMap((item) => [item.description, ...item.properties].filter((line) => line.includes('{@')).map((line) => `${item.name}|${item.source}: ${line}`))
    expect(inlineRemainders).toEqual([])
    expect([...new Set(catalog.map((item) => item.category))]).toEqual(expect.arrayContaining(['Weapon', 'Armor', 'Potion', 'Scroll', 'Ring', 'Tool', 'Vehicle', 'Tattoo', 'Other']))
    expect(diagnostics?.specificVariants).toBeGreaterThan(3000)
    expect(diagnostics?.genericVariantTemplates).toBe(magicVariantsJson.magicvariant.length)
    expect(diagnostics?.idCollisions).toEqual([])
    expect(diagnostics?.unresolvedReferences).toEqual([])
  })
})
