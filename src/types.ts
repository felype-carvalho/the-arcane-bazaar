export type ItemType = 'Magic' | 'Common'
export type Rarity = 'None' | 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Artifact' | 'Varies' | 'Unknown'
export type ItemEdition = 'classic' | 'one' | 'unspecified'
export type ItemOrigin = 'item' | 'itemGroup' | 'baseitem' | 'specificVariant'
export type Category =
  | 'Consumable'
  | 'Potion'
  | 'Scroll'
  | 'Apparel'
  | 'Ring'
  | 'Amulet'
  | 'Weapon'
  | 'Armor'
  | 'Spellcasting Focus'
  | 'Staff / Rod'
  | 'Tattoo'
  | 'Clockwork'
  | 'Instrument'
  | 'Bag/Container'
  | 'Gem'
  | 'Tome'
  | 'Tool'
  | 'Summonable'
  | 'Ammunition'
  | 'Adventuring Gear'
  | 'Explosive'
  | 'Food and Drink'
  | 'Mount'
  | 'Poison'
  | 'Service'
  | 'Trade Good'
  | 'Vehicle'
  | 'Other'
export type Availability = 'Available' | 'Limited' | 'Unavailable'

export interface Item {
  id: string
  name: string
  icon: string
  type: ItemType
  rarity: Rarity
  category: Category
  subtype: string
  availability: Availability
  basePriceGp: number | null
  weight: string
  description: string
  tags: string[]
  properties: string[]
  attunement: boolean
  source: string
  edition: ItemEdition
  origin: ItemOrigin
}

export interface ItemFilters {
  search: string
  types: ItemType[]
  rarities: Rarity[]
  categories: Category[]
  availabilities: Availability[]
}

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

export type SortKey = 'name' | 'type' | 'category' | 'rarity' | 'price'
export type SortDirection = 'asc' | 'desc'
