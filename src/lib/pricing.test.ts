import { describe, expect, it } from 'vitest'
import { ITEMS } from '../data/items'
import { calculatePricing, DEFAULT_MODIFIERS } from './pricing'

const fixedItem = ITEMS.find((item) => item.id === 'bag-of-holding')!
const variableItem = ITEMS.find((item) => item.id === 'vorpal-sword')!

describe('calculatePricing', () => {
  it('uses 100% for buying and 50% for selling at neutral settings', () => {
    const result = calculatePricing(fixedItem, DEFAULT_MODIFIERS)
    expect(result?.buyPrice).toBe(4000)
    expect(result?.sellPrice).toBe(2000)
    expect(result?.buyTotalPercent).toBe(0)
    expect(result?.sellTotalPercent).toBe(0)
  })

  it('adds market, trade, frequency, and custom percentages', () => {
    const result = calculatePricing(fixedItem, {
      economy: 'thriving',
      market: 'highDemand',
      reputation: 'celebrated',
      negotiation: 'skilled',
      magicFrequency: 'rare',
      custom: [{ id: 'festival', name: 'Festival', percent: 5 }],
    })
    expect(result?.buyTotalPercent).toBe(50)
    expect(result?.sellTotalPercent).toBe(90)
    expect(result?.buyPrice).toBe(6000)
    expect(result?.sellPrice).toBe(3800)
  })

  it('clamps extreme modifiers and never returns less than one GP', () => {
    const high = calculatePricing(fixedItem, { ...DEFAULT_MODIFIERS, custom: [{ id: 'high', name: 'High', percent: 1000 }] })
    const low = calculatePricing({ ...fixedItem, basePriceGp: 1 }, { ...DEFAULT_MODIFIERS, custom: [{ id: 'low', name: 'Low', percent: -1000 }] })
    expect(high?.buyTotalPercent).toBe(300)
    expect(high?.buyPrice).toBe(16000)
    expect(low?.buyTotalPercent).toBe(-90)
    expect(low?.buyPrice).toBe(1)
    expect(low?.sellPrice).toBe(1)
  })

  it('requires a manual price for variable items', () => {
    expect(calculatePricing(variableItem, DEFAULT_MODIFIERS)).toBeNull()
    expect(calculatePricing(variableItem, DEFAULT_MODIFIERS, 12000)?.buyPrice).toBe(12000)
  })
})
