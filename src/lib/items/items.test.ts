import { describe, expect, it } from 'vitest'
import { editionsAreCompatible, evaluateItemExpression, matchesVariantRequirements } from './build-variants'
import { resolveCategory } from './categories'
import { parseUid } from './indexes'
import { deriveAvailability, deriveBasePriceGp, normalizeRarity } from './normalize-item'
import { cleanInlineTags, createItemEntryIndex, resolveEntityEntries } from './resolve-entries'
import { resolveCopies } from './resolve-copy'
import type { ProcessedItemEntity, RawItemEntity, RawItemEntry, RawMagicVariant } from './raw-types'

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }
  return value
}

describe('item UIDs', () => {
  it('parses identifiers with and without a source', () => {
    expect(parseUid('RG|XDMG')).toEqual({ name: 'RG', source: 'XDMG', original: 'RG|XDMG' })
    expect(parseUid('RG')).toEqual({ name: 'RG', source: undefined, original: 'RG' })
  })
})

describe('_copy resolution', () => {
  it('resolves recursive copies and the supported modifications without mutating input', () => {
    const entities = deepFreeze<RawItemEntity[]>([
      { name: 'Parent', source: 'TST', entries: ['a', 'b'], property: ['existing'], page: 1, metadata: { obsolete: true } },
      { name: 'Middle', source: 'TST', _copy: { name: 'Parent', source: 'TST', _mod: { entries: { mode: 'insertArr', index: 1, items: 'inserted' } } } },
      { name: 'Child', source: 'TST', _copy: { name: 'Middle', source: 'TST', _preserve: { page: true }, _mod: {
        entries: [
          { mode: 'replaceArr', replace: { value: 'b' }, items: 'replaced' },
          { mode: 'appendArr', items: 'last' },
        ],
        property: { mode: 'appendIfNotExistsArr', items: ['existing', 'new'] },
        'metadata.obsolete': 'remove',
        'metadata.label': { mode: 'setProp', value: 'updated' },
      } } },
    ])
    const before = JSON.stringify(entities)
    const resolved = resolveCopies(entities, { collectionName: 'item' })
    expect(resolved[2].entries).toEqual(['a', 'inserted', 'replaced', 'last'])
    expect(resolved[2].property).toEqual(['existing', 'new'])
    expect(resolved[2].metadata).toEqual({ label: 'updated' })
    expect(resolved[2].page).toBe(1)
    expect(resolved[2]._copy).toBeUndefined()
    expect(JSON.stringify(entities)).toBe(before)
  })

  it('reports missing parents, cycles, and unknown modification modes', () => {
    expect(() => resolveCopies([{ name: 'Lost', source: 'TST', _copy: { name: 'Missing', source: 'TST' } }], { collectionName: 'item' })).toThrow(/missing _copy parent/i)
    expect(() => resolveCopies([
      { name: 'A', source: 'TST', _copy: { name: 'B', source: 'TST' } },
      { name: 'B', source: 'TST', _copy: { name: 'A', source: 'TST' } },
    ], { collectionName: 'item' })).toThrow(/cycle/i)
    expect(() => resolveCopies([
      { name: 'A', source: 'TST', entries: [] },
      { name: 'B', source: 'TST', _copy: { name: 'A', source: 'TST', _mod: { entries: { mode: 'mystery' } } } },
    ], { collectionName: 'item' })).toThrow(/unsupported _mod mode/i)
  })
})

describe('specific magic variants', () => {
  const base = { name: 'Longsword', source: 'PHB', type: 'M', weapon: true, property: ['V'], value: 1500, weight: 3 } satisfies RawItemEntity
  const variant = { name: '+1 Weapon', edition: 'classic', requires: [{ weapon: true }], excludes: { net: true }, inherits: { source: 'DMG' } } satisfies RawMagicVariant

  it('matches scalar, array, and object requirements and exclusions', () => {
    expect(matchesVariantRequirements(base, variant)).toBe(true)
    expect(matchesVariantRequirements({ ...base, net: true }, variant)).toBe(false)
    expect(matchesVariantRequirements(base, { ...variant, requires: [{ property: 'V' }] })).toBe(true)
    expect(matchesVariantRequirements(base, { ...variant, requires: [{ nested: { enabled: true } }] })).toBe(false)
  })

  it('keeps neutral bases compatible while separating classic and 2024 editions', () => {
    expect(editionsAreCompatible(undefined, 'classic')).toBe(true)
    expect(editionsAreCompatible('classic', 'classic')).toBe(true)
    expect(editionsAreCompatible('classic', undefined)).toBe(false)
    expect(editionsAreCompatible('one', undefined)).toBe(true)
    expect(editionsAreCompatible('one', 'classic')).toBe(false)
  })

  it('evaluates only restricted arithmetic over known base fields', () => {
    expect(evaluateItemExpression('([[baseItem.value]] + 500) * 2', base)).toBe(4000)
    expect(() => evaluateItemExpression('globalThis.alert(1)', base)).toThrow(/unsupported expression/i)
    expect(() => evaluateItemExpression('[[baseItem.missing]] + 1', base)).toThrow(/non-numeric/i)
  })
})

describe('rich entries', () => {
  it('resolves itemEntry templates, placeholders, and visible 5etools tag text', () => {
    const entries: RawItemEntry[] = [{ name: 'Resistance', source: 'DMG', entriesTemplate: ['You resist {{item.resist}} and cast {@spell fireball|PHB}. Bonus {=bonusAc}.'] }]
    const entity = { name: 'Test Armor', source: 'DMG', resist: ['fire'], bonusAc: '+1', entries: ['{#itemEntry Resistance}'] }
    expect(resolveEntityEntries(entity, createItemEntryIndex(entries))).toEqual(['You resist fire and cast fireball. Bonus +1.'])
    expect(cleanInlineTags('{@b Bold} and {@dc 15}')).toBe('Bold and DC 15')
    expect(cleanInlineTags('{@note See {@book Player Handbook|PHB} for details.}')).toBe('See Player Handbook for details.')
  })

  it('fails visibly for missing references', () => {
    expect(() => resolveEntityEntries({ name: 'Broken', source: 'TST', entries: ['{#itemEntry Missing|TST}'] }, new Map())).toThrow(/unresolved itemEntry/i)
  })
})

describe('domain normalization rules', () => {
  it('maps rarity, availability, price, and category independently', () => {
    expect(normalizeRarity('unknown (magic)')).toBe('Unknown')
    expect(normalizeRarity('none')).toBe('None')
    expect(deriveAvailability('Rare')).toBe('Limited')
    expect(deriveAvailability('Varies')).toBe('Unavailable')
    const entity = { name: 'Test', source: 'TST', rarity: 'rare', value: 12345, _catalogOrigin: 'item', _catalogEdition: 'unspecified' } as ProcessedItemEntity
    expect(deriveBasePriceGp(entity, 'Rare')).toBe(123.45)
    expect(deriveBasePriceGp({ ...entity, value: undefined }, 'Rare')).toBe(4000)
    expect(resolveCategory({ name: 'Needle', source: 'TST', tattoo: true })).toBe('Tattoo')
    expect(resolveCategory({ name: 'Longsword', source: 'TST', type: 'M|XPHB' })).toBe('Weapon')
    expect(resolveCategory({ name: 'Manual of Practice', source: 'TST' })).toBe('Tome')
  })
})
