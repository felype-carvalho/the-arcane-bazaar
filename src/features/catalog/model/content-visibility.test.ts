import { describe, expect, it } from 'vitest'
import { ITEM_FIXTURES } from '../test/fixtures/items'
import type { Item, VariantBaseOption } from '../types'
import { applySourceSelection } from './content-visibility'

const modernItem: Item = {
  ...ITEM_FIXTURES[0],
  id: 'modern-item',
  name: 'Modern Item',
  source: 'XDMG',
  edition: 'one',
}

function variantOption(id: string, baseSource: string): VariantBaseOption {
  return {
    id,
    baseItemId: `${id}-base`,
    baseName: `${id} base`,
    baseSource,
    basePriceGp: 10,
    variantPriceGp: 100,
    effectivePriceGp: 110,
    resolvedItem: { ...modernItem, id: `${id}-resolved` },
  }
}

describe('source selection visibility', () => {
  it('keeps only selected item sources without case sensitivity', () => {
    const legacyItem = { ...ITEM_FIXTURES[0], id: 'legacy-item', source: 'DMG' }

    expect(applySourceSelection([legacyItem, modernItem], ['xdmg'])).toEqual([modernItem])
    expect(applySourceSelection([legacyItem, modernItem], ['DMG', 'XDMG'])).toHaveLength(2)
    expect(applySourceSelection([legacyItem, modernItem], [])).toEqual([])
  })

  it('filters base options without mutating the original variant', () => {
    const variant: Item = {
      ...modernItem,
      id: 'mixed-variant',
      origin: 'genericVariant',
      variantOptions: [variantOption('legacy', 'PHB'), variantOption('modern', 'XPHB')],
    }
    const snapshot = structuredClone(variant)

    const result = applySourceSelection([variant], ['XDMG', 'XPHB'])

    expect(result[0].variantOptions?.map((option) => option.id)).toEqual(['modern'])
    expect(result[0]).not.toBe(variant)
    expect(variant).toEqual(snapshot)
  })

  it('removes a generic variant when every compatible base is deselected', () => {
    const variant: Item = {
      ...modernItem,
      id: 'unavailable-variant',
      origin: 'genericVariant',
      variantOptions: [variantOption('legacy', 'PHB')],
    }

    expect(applySourceSelection([variant], ['XDMG'])).toEqual([])
  })

  it('removes a variant when its own source is deselected even if a base remains selected', () => {
    const variant: Item = {
      ...modernItem,
      id: 'deselected-variant',
      origin: 'genericVariant',
      variantOptions: [variantOption('modern', 'XPHB')],
    }

    expect(applySourceSelection([variant], ['XPHB'])).toEqual([])
  })
})
