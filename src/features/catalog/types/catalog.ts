export type ItemType = 'Magic' | 'Common'
export type Rarity = 'None' | 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Artifact' | 'Varies' | 'Unknown'
export type ItemEdition = 'classic' | 'one' | 'unspecified'
export type ItemOrigin = 'item' | 'itemGroup' | 'baseitem' | 'genericVariant' | 'specificVariant'
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
    | 'Wondrous'
export type Availability = 'Available' | 'Limited' | 'Unavailable'

export interface Item {
    id: string
    name: string
    icon: string
    type: ItemType
    rarity: Rarity
    category: Category
    categories: Category[]
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
    groupOptions?: ItemGroupOption[]
    availableRarities?: Rarity[]
    hasExplicitPrice?: boolean
    variantPriceGp?: number | null
    variantOptions?: VariantBaseOption[]
}

export type GroupOptionKind = 'member' | 'inferredInitialStage'
export type RarityOrigin = 'explicit' | 'inherited' | 'inferred' | 'unknown'

export interface ItemGroupOption {
    id: string
    label: string
    source: string
    kind: GroupOptionKind
    rarityOrigin: RarityOrigin
    resolvedItem: Item
}

export interface VariantBaseOption {
    id: string
    baseItemId: string
    baseName: string
    baseSource: string
    basePriceGp: number | null
    variantPriceGp: number | null
    effectivePriceGp: number | null
    resolvedItem: Item
}

export interface ItemFilters {
    search: string
    types: ItemType[]
    rarities: Rarity[]
    categories: Category[]
    availabilities: Availability[]
    sources: string[]
}

export type SortKey = 'name' | 'type' | 'category' | 'rarity' | 'price'
export type SortDirection = 'asc' | 'desc'
