import type {
  Economy,
  Item,
  MagicFrequency,
  Market,
  Negotiation,
  PricingAdjustment,
  PricingModifiers,
  PricingResult,
  Reputation,
} from '../types'
import { CurrencyConverter } from './currency'

export const DEFAULT_MODIFIERS: PricingModifiers = {
  economy: 'stable',
  market: 'regular',
  reputation: 'neutral',
  negotiation: 'standard',
  magicFrequency: 'standard',
  custom: [],
}

export interface PricingModifierOption<T extends string> {
  value: T
  label: string
  buyPercent: number
  sellPercent: number
  isBase?: boolean
}

export const ECONOMY_OPTIONS = [
  { value: 'stable', label: 'Stable Economy', buyPercent: 0, sellPercent: 0, isBase: true },
  { value: 'prosperous', label: 'Prosperous Economy', buyPercent: 20, sellPercent: 20 },
  { value: 'depressed', label: 'Depressed Economy', buyPercent: -10, sellPercent: -10 },
] as const satisfies readonly PricingModifierOption<Economy>[]

export const MARKET_OPTIONS = [
  { value: 'regular', label: 'Regular Market', buyPercent: 0, sellPercent: 0, isBase: true },
  { value: 'competitive', label: 'Competitive Market', buyPercent: -20, sellPercent: -15 },
  { value: 'blackMarket', label: 'Black Market', buyPercent: 35, sellPercent: 30 },
  { value: 'restricted', label: 'Restricted Market', buyPercent: 25, sellPercent: 25 },
] as const satisfies readonly PricingModifierOption<Market>[]

export const REPUTATION_OPTIONS = [
  { value: 'neutral', label: 'Neutral', buyPercent: 0, sellPercent: 0, isBase: true },
  { value: 'despised', label: 'Despised', buyPercent: 12, sellPercent: -12 },
  { value: 'mistrusted', label: 'Mistrusted', buyPercent: 6, sellPercent: -6 },
  { value: 'honored', label: 'Honored', buyPercent: -6, sellPercent: 6 },
  { value: 'admired', label: 'Admired', buyPercent: -12, sellPercent: 12 },
] as const satisfies readonly PricingModifierOption<Reputation>[]

export const NEGOTIATION_OPTIONS = [
  { value: 'success', label: 'Success', buyPercent: -10, sellPercent: 10 },
  { value: 'standard', label: 'Standard', buyPercent: 0, sellPercent: 0, isBase: true },
  { value: 'failure', label: 'Failure', buyPercent: 10, sellPercent: -10 },
] as const satisfies readonly PricingModifierOption<Negotiation>[]

export const MAGIC_FREQUENCY_OPTIONS = [
  { value: 'rare', label: 'Rare', buyPercent: 25, sellPercent: 25 },
  { value: 'standard', label: 'Standard', buyPercent: 0, sellPercent: 0, isBase: true },
  { value: 'abundant', label: 'Abundant', buyPercent: -15, sellPercent: -15 },
] as const satisfies readonly PricingModifierOption<MagicFrequency>[]

const clamp = (value: number) => Math.min(300, Math.max(-90, value))
const signedLabel = (value: number) => `${value > 0 ? '+' : ''}${value}%`

export const pricingModifierOptionLabel = (option: PricingModifierOption<string>) => option.isBase
  ? `${option.label} · Base (B 0% | S 0%)`
  : `${option.label} · B ${signedLabel(option.buyPercent)} | S ${signedLabel(option.sellPercent)}`

function findModifier<T extends string>(options: readonly PricingModifierOption<T>[], value: T) {
  const option = options.find((entry) => entry.value === value)
  if (!option) throw new Error(`Unknown pricing modifier: ${value}`)
  return option
}

export function calculatePricing(item: Item, modifiers: PricingModifiers, manualBasePrice?: number | null): PricingResult | null {
  const basePrice = item.basePriceGp ?? manualBasePrice
  if (basePrice == null || !Number.isFinite(basePrice) || basePrice <= 0) return null

  const economy = findModifier(ECONOMY_OPTIONS, modifiers.economy)
  const market = findModifier(MARKET_OPTIONS, modifiers.market)
  const reputation = findModifier(REPUTATION_OPTIONS, modifiers.reputation)
  const negotiation = findModifier(NEGOTIATION_OPTIONS, modifiers.negotiation)
  const adjustments: PricingAdjustment[] = [
    { label: `Economy · ${economy.label}`, buyPercent: economy.buyPercent, sellPercent: economy.sellPercent },
    { label: `Market · ${market.label}`, buyPercent: market.buyPercent, sellPercent: market.sellPercent },
    { label: `Party Reputation · ${reputation.label}`, buyPercent: reputation.buyPercent, sellPercent: reputation.sellPercent },
    { label: `NPC Negotiation · ${negotiation.label}`, buyPercent: negotiation.buyPercent, sellPercent: negotiation.sellPercent },
  ]

  if (item.type === 'Magic') {
    const magicFrequency = findModifier(MAGIC_FREQUENCY_OPTIONS, modifiers.magicFrequency)
    adjustments.push({ label: `Magic Frequency · ${magicFrequency.label}`, buyPercent: magicFrequency.buyPercent, sellPercent: magicFrequency.sellPercent })
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
    buyPrice: CurrencyConverter.normalizeGp(basePrice * (1 + buyTotalPercent / 100)),
    sellPrice: CurrencyConverter.normalizeGp(basePrice * 0.5 * (1 + sellTotalPercent / 100)),
    adjustments,
  }
}

export { signedLabel }
