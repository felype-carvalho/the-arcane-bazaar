import type { Item, PricingAdjustment, PricingModifiers, PricingResult } from '../types'

export const DEFAULT_MODIFIERS: PricingModifiers = {
  economy: 'stable',
  market: 'balanced',
  reputation: 'unknown',
  negotiation: 'fair',
  magicFrequency: 'standard',
  custom: [],
}

const ECONOMY = { recession: -20, stable: 0, thriving: 15 } as const
const MARKET = { oversupply: -20, balanced: 0, highDemand: 25 } as const
const FREQUENCY = { rare: 25, standard: 0, abundant: -15 } as const
const REPUTATION = {
  unknown: { buy: 0, sell: 0 },
  trusted: { buy: -5, sell: 5 },
  celebrated: { buy: -10, sell: 10 },
} as const
const NEGOTIATION = {
  poor: { buy: 10, sell: -10 },
  fair: { buy: 0, sell: 0 },
  skilled: { buy: -10, sell: 10 },
} as const

const clamp = (value: number) => Math.min(300, Math.max(-90, value))
const signedLabel = (value: number) => `${value > 0 ? '+' : ''}${value}%`

export function formatGp(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(value)} GP`
}

export function calculatePricing(item: Item, modifiers: PricingModifiers, manualBasePrice?: number | null): PricingResult | null {
  const basePrice = item.basePriceGp ?? manualBasePrice
  if (basePrice == null || !Number.isFinite(basePrice) || basePrice <= 0) return null

  const adjustments: PricingAdjustment[] = [
    { label: `Economy · ${modifiers.economy}`, buyPercent: ECONOMY[modifiers.economy], sellPercent: ECONOMY[modifiers.economy] },
    { label: `Market · ${modifiers.market === 'highDemand' ? 'high demand' : modifiers.market}`, buyPercent: MARKET[modifiers.market], sellPercent: MARKET[modifiers.market] },
    { label: `Reputation · ${modifiers.reputation}`, buyPercent: REPUTATION[modifiers.reputation].buy, sellPercent: REPUTATION[modifiers.reputation].sell },
    { label: `Negotiation · ${modifiers.negotiation}`, buyPercent: NEGOTIATION[modifiers.negotiation].buy, sellPercent: NEGOTIATION[modifiers.negotiation].sell },
  ]

  if (item.type === 'Magic') {
    adjustments.push({ label: `Magic frequency · ${modifiers.magicFrequency}`, buyPercent: FREQUENCY[modifiers.magicFrequency], sellPercent: FREQUENCY[modifiers.magicFrequency] })
  }

  modifiers.custom.forEach((modifier) => {
    const percent = Number.isFinite(modifier.percent) ? modifier.percent : 0
    adjustments.push({ label: modifier.name || 'Custom modifier', buyPercent: percent, sellPercent: percent })
  })

  const buyTotalPercent = clamp(adjustments.reduce((sum, value) => sum + value.buyPercent, 0))
  const sellTotalPercent = clamp(adjustments.reduce((sum, value) => sum + value.sellPercent, 0))

  return {
    basePrice,
    buyTotalPercent,
    sellTotalPercent,
    buyPrice: Math.max(1, Math.round(basePrice * (1 + buyTotalPercent / 100))),
    sellPrice: Math.max(1, Math.round(basePrice * 0.5 * (1 + sellTotalPercent / 100))),
    adjustments,
  }
}

export { signedLabel }
