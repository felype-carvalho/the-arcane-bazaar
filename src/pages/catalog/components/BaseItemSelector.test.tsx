import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ITEM_FIXTURES } from '../../../test/fixtures/items'
import type { VariantBaseOption } from '../../../types'
import { BaseItemSelector } from './BaseItemSelector'

function option(id: string, baseName: string, baseSource: string): VariantBaseOption {
  return {
    id,
    baseItemId: `base-${id}`,
    baseName,
    baseSource,
    basePriceGp: 10,
    variantPriceGp: 100,
    effectivePriceGp: 110,
    resolvedItem: { ...ITEM_FIXTURES[2], id: `resolved-${id}` },
  }
}

describe('BaseItemSelector', () => {
  it('orders options by source and then alphabetically by base-item name', () => {
    const item = {
      ...ITEM_FIXTURES[2],
      variantOptions: [
        option('xphb-sword', 'Sword', 'XPHB'),
        option('phb-sword', 'Sword', 'PHB'),
        option('phb-axe', 'Axe', 'PHB'),
        option('xdmg-armor', 'Armor', 'XDMG'),
        option('dmg-wand', 'Wand', 'DMG'),
        option('xge-blade', 'Blade', 'XGE'),
        option('tce-amulet', 'Amulet', 'TCE'),
      ],
    }

    render(<BaseItemSelector item={item} onSelect={vi.fn()} />)

    expect(within(screen.getByRole('combobox', { name: 'Compatible base item' })).getAllByRole('option').map((entry) => entry.textContent)).toEqual([
      'Select a base item',
      "Sword · PHB'24",
      "Axe · PHB'14",
      "Sword · PHB'14",
      "Armor · DMG'24",
      "Wand · DMG'14",
      'Amulet · TCE',
      'Blade · XGE',
    ])
  })
})
