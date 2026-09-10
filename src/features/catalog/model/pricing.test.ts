import { describe, expect, it } from 'vitest'
import { ITEM_FIXTURES } from '../test/fixtures/items'
import type { PricingModifiers } from '../types'
import {
  calculatePricing,
  DEFAULT_MODIFIERS,
  ECONOMY_OPTIONS,
  MAGIC_FREQUENCY_OPTIONS,
  MARKET_OPTIONS,
  NEGOTIATION_OPTIONS,
  REPUTATION_OPTIONS,
} from './pricing'

const fixedItem = ITEM_FIXTURES.find((item) => item.id === 'bag-of-holding')!
const variableItem = ITEM_FIXTURES.find((item) => item.id === 'vorpal-sword')!

interface ModifierCase {
  name: string
  adjustmentLabel: string
  modifiers: PricingModifiers
  buyPercent: number
  sellPercent: number
}

const modifierCases: ModifierCase[] = [
  ...ECONOMY_OPTIONS.map((option) => ({
    name: `Economy: ${option.label}`,
    adjustmentLabel: `Economy · ${option.label}`,
    modifiers: { ...DEFAULT_MODIFIERS, economy: option.value },
    buyPercent: option.buyPercent,
    sellPercent: option.sellPercent,
  })),
  ...MARKET_OPTIONS.map((option) => ({
    name: `Market: ${option.label}`,
    adjustmentLabel: `Market · ${option.label}`,
    modifiers: { ...DEFAULT_MODIFIERS, market: option.value },
    buyPercent: option.buyPercent,
    sellPercent: option.sellPercent,
  })),
  ...REPUTATION_OPTIONS.map((option) => ({
    name: `Party Reputation: ${option.label}`,
    adjustmentLabel: `Party Reputation · ${option.label}`,
    modifiers: { ...DEFAULT_MODIFIERS, reputation: option.value },
    buyPercent: option.buyPercent,
    sellPercent: option.sellPercent,
  })),
  ...NEGOTIATION_OPTIONS.map((option) => ({
    name: `NPC Negotiation: ${option.label}`,
    adjustmentLabel: `NPC Negotiation · ${option.label}`,
    modifiers: { ...DEFAULT_MODIFIERS, negotiation: option.value },
    buyPercent: option.buyPercent,
    sellPercent: option.sellPercent,
  })),
  ...MAGIC_FREQUENCY_OPTIONS.map((option) => ({
    name: `Magic Frequency: ${option.label}`,
    adjustmentLabel: `Magic Frequency · ${option.label}`,
    modifiers: { ...DEFAULT_MODIFIERS, magicFrequency: option.value },
    buyPercent: option.buyPercent,
    sellPercent: option.sellPercent,
  })),
]

describe('calculatePricing', () => {
  it('uses 100% for buying and 50% for selling at neutral settings', () => {
    const result = calculatePricing(fixedItem, DEFAULT_MODIFIERS)
    expect(result?.buyPrice).toBe(4000)
    expect(result?.sellPrice).toBe(2000)
    expect(result?.buyTotalPercent).toBe(0)
    expect(result?.sellTotalPercent).toBe(0)
  })

  it.each(modifierCases)('applies the configured buy and sell percentages for $name', ({ adjustmentLabel, modifiers, buyPercent, sellPercent }) => {
    const result = calculatePricing(fixedItem, modifiers)

    expect(result?.buyTotalPercent).toBe(buyPercent)
    expect(result?.sellTotalPercent).toBe(sellPercent)
    expect(result?.buyPrice).toBe(4000 * (1 + buyPercent / 100))
    expect(result?.sellPrice).toBe(2000 * (1 + sellPercent / 100))
    expect(result?.adjustments).toContainEqual({ label: adjustmentLabel, buyPercent, sellPercent })
  })

  it('adds independent buy and sell percentages across modifier groups', () => {
    const result = calculatePricing(fixedItem, {
      economy: 'prosperous',
      market: 'competitive',
      reputation: 'admired',
      negotiation: 'success',
      magicFrequency: 'rare',
      custom: [],
    })
    expect(result?.buyTotalPercent).toBe(3)
    expect(result?.sellTotalPercent).toBe(52)
    expect(result?.buyPrice).toBe(4120)
    expect(result?.sellPrice).toBe(3040)
  })

  it('does not apply magic frequency to mundane items', () => {
    const mundaneItem = { ...fixedItem, type: 'Common' as const }
    const result = calculatePricing(mundaneItem, { ...DEFAULT_MODIFIERS, magicFrequency: 'rare' })

    expect(result?.buyTotalPercent).toBe(0)
    expect(result?.sellTotalPercent).toBe(0)
    expect(result?.adjustments.some((adjustment) => adjustment.label.startsWith('Magic Frequency'))).toBe(false)
  })

  it('clamps extreme modifiers while preserving sub-GP prices', () => {
    const high = calculatePricing(fixedItem, { ...DEFAULT_MODIFIERS, custom: [{ id: 'high', name: 'High', percent: 1000 }] })
    const low = calculatePricing({ ...fixedItem, basePriceGp: 1 }, { ...DEFAULT_MODIFIERS, custom: [{ id: 'low', name: 'Low', percent: -1000 }] })
    expect(high?.buyTotalPercent).toBe(300)
    expect(high?.buyPrice).toBe(16000)
    expect(low?.buyTotalPercent).toBe(-90)
    expect(low?.buyPrice).toBe(0.1)
    expect(low?.sellPrice).toBe(0.05)
  })

  it('keeps fractional GP amounts at neutral settings', () => {
    const result = calculatePricing({ ...fixedItem, basePriceGp: 0.5 }, DEFAULT_MODIFIERS)
    expect(result?.buyPrice).toBe(0.5)
    expect(result?.sellPrice).toBe(0.25)
  })

  it('requires a manual price for variable items', () => {
    expect(calculatePricing(variableItem, DEFAULT_MODIFIERS)).toBeNull()
    expect(calculatePricing(variableItem, DEFAULT_MODIFIERS, 12000)?.buyPrice).toBe(12000)
  })
})
