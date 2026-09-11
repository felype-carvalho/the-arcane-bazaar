import { describe, expect, it } from 'vitest'
import items from '../data/items.json'
import itemsBase from '../data/items-base.json'
import magicVariants from '../data/magicvariants.json'
import { ALL_SOURCE_CODES, normalizeSource, SOURCE_DEFINITIONS, SOURCES_BY_EDITION } from './sources'

describe('source registry', () => {
  it('deduplicates and sorts every selectable source', () => {
    expect(SOURCE_DEFINITIONS).toHaveLength(168)
    expect(new Set(ALL_SOURCE_CODES.map(normalizeSource)).size).toBe(168)
    expect(ALL_SOURCE_CODES).toEqual([...ALL_SOURCE_CODES].sort((left, right) => (
      left.localeCompare(right, 'en-US', { sensitivity: 'base' })
    )))
  })

  it('classifies sources around the edition cutoff', () => {
    expect(SOURCES_BY_EDITION['5.5e']).toHaveLength(34)
    expect(SOURCES_BY_EDITION['5e']).toHaveLength(134)
    expect(SOURCES_BY_EDITION['5.5e'].every(({ published }) => published != null && published > '2024-09-16')).toBe(true)
    expect(SOURCES_BY_EDITION['5e'].every(({ published }) => published == null || published <= '2024-09-16')).toBe(true)
  })

  it('includes the five supplemental catalog sources as 5e', () => {
    const legacySources = new Set(SOURCES_BY_EDITION['5e'].map(({ source }) => source))
    expect(['TftYP', 'RoTOS', 'HAT-LMI', 'MCV2DC', 'EET'].every((source) => legacySources.has(source))).toBe(true)
  })

  it('covers every source that can produce a catalog item or variant base', () => {
    const selectable = new Set(ALL_SOURCE_CODES.map(normalizeSource))
    const rawSources = [
      ...items.item.map(({ source }) => source),
      ...items.itemGroup.map(({ source }) => source),
      ...itemsBase.baseitem.map(({ source }) => source),
      ...magicVariants.magicvariant.map((variant) => variant.source ?? variant.inherits?.source),
    ].filter((source): source is string => typeof source === 'string')

    expect(rawSources.filter((source) => !selectable.has(normalizeSource(source)))).toEqual([])
  })
})
