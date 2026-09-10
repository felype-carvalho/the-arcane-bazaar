export type Economy = 'stable' | 'prosperous' | 'depressed'
export type Market = 'regular' | 'competitive' | 'blackMarket' | 'restricted'
export type Reputation = 'neutral' | 'despised' | 'mistrusted' | 'honored' | 'admired'
export type Negotiation = 'success' | 'standard' | 'failure'
export type MagicFrequency = 'rare' | 'standard' | 'abundant'

export interface CustomModifier {
  id: string
  name: string
  percent: number
}

export interface PricingModifiers {
  economy: Economy
  market: Market
  reputation: Reputation
  negotiation: Negotiation
  magicFrequency: MagicFrequency
  custom: CustomModifier[]
}

export interface PricingAdjustment {
  label: string
  buyPercent: number
  sellPercent: number
}

export interface PricingResult {
  basePrice: number
  buyTotalPercent: number
  sellTotalPercent: number
  buyPrice: number
  sellPrice: number
  adjustments: PricingAdjustment[]
}
