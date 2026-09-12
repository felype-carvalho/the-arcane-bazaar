import { describe, expect, it } from 'vitest'
import items from '../data/items.json'
import itemsBase from '../data/items-base.json'
import magicVariants from '../data/magicvariants.json'
import { ALL_SOURCE_CODES, normalizeSource, SOURCE_DEFINITIONS, SOURCE_GROUPS, SOURCES_BY_EDITION } from './sources'

describe('source registry', () => {
  it('deduplicates sources and sorts each edition from oldest to newest', () => {
    expect(SOURCE_DEFINITIONS).toHaveLength(155)
    expect(new Set(ALL_SOURCE_CODES.map(normalizeSource)).size).toBe(155)

    for (const sources of Object.values(SOURCES_BY_EDITION)) {
      expect(sources).toEqual([...sources].sort((left, right) => {
        const publishedComparison = (left.published ?? '\uffff').localeCompare(right.published ?? '\uffff')
        return publishedComparison || left.source.localeCompare(right.source, 'en-US', { sensitivity: 'base' })
      }))
    }
  })

  it('classifies sources around the edition cutoff', () => {
    expect(SOURCES_BY_EDITION['5.5e']).toHaveLength(30)
    expect(SOURCES_BY_EDITION['5e']).toHaveLength(125)
    expect(SOURCES_BY_EDITION['5.5e'].every(({ published }) => published != null && published > '2024-09-16')).toBe(true)
    expect(SOURCES_BY_EDITION['5e'].every(({ published }) => published == null || published <= '2024-09-16')).toBe(true)
  })

  it('includes only selectable source groups', () => {
    expect(new Set(SOURCE_DEFINITIONS.map(({ group }) => group))).toEqual(new Set(SOURCE_GROUPS))

    const selectable = new Set(ALL_SOURCE_CODES)
    expect([
      'Screen', 'ScreenDungeonKit', 'ScreenWildernessKit', 'ScreenSpelljammer', 'XScreen', 'XScreenRHW',
      'AL', 'HF', 'HFFotM', 'PaF', 'CaBoMP', 'SAC', 'XSAC',
    ]
      .filter((source) => selectable.has(source))).toEqual([])
  })

  it('includes the five supplemental catalog sources as 5e supplements', () => {
    const manualSources = new Set(['TftYP', 'RoTOS', 'HAT-LMI', 'MCV2DC', 'EET'])
    const legacySupplements = SOURCES_BY_EDITION['5e']
      .filter(({ source }) => manualSources.has(source))

    expect(legacySupplements).toHaveLength(manualSources.size)
    expect(legacySupplements.every(({ group }) => group === 'supplement')).toBe(true)
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
