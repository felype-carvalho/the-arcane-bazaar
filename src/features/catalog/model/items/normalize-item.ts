import type { Availability, Item, ItemEdition, Rarity } from '../../types'
import { CATEGORY_ICONS, resolveCategory } from './categories'
import { lookupUid } from './indexes'
import { renderEntryTree, resolveEntityEntries } from './resolve-entries'
import type { ProcessedItemEntity, RawItemEntry, RawItemProperty, RawItemType, RawNamedEntity } from './raw-types'
import { isJsonRecord } from './raw-types'

export interface NormalizationIndexes {
  itemEntries: ReadonlyMap<string, RawItemEntry>
  itemTypes: ReadonlyMap<string, RawItemType>
  itemProperties: ReadonlyMap<string, RawItemProperty>
  itemMasteries: ReadonlyMap<string, RawNamedEntity>
  typeAdditionalEntries: ReadonlyMap<string, unknown[]>
}

const DAMAGE_TYPES: Record<string, string> = {
  A: 'acid', B: 'bludgeoning', C: 'cold', F: 'fire', L: 'lightning', N: 'necrotic', P: 'piercing',
  O: 'poison', Y: 'psychic', R: 'radiant', S: 'slashing', T: 'thunder', I: 'force',
}

const RARITY_MAP: Record<string, Rarity> = {
  none: 'None', common: 'Common', uncommon: 'Uncommon', rare: 'Rare', 'very rare': 'Very Rare',
  legendary: 'Legendary', artifact: 'Artifact', varies: 'Varies', unknown: 'Unknown', 'unknown (magic)': 'Unknown',
}

const FALLBACK_PRICE_GP: Partial<Record<Rarity, number>> = {
  Common: 100,
  Uncommon: 400,
  Rare: 4_000,
  'Very Rare': 40_000,
  Legendary: 200_000,
}

const MAGIC_TYPE_SOURCES = new Set(['RD', 'RG', 'SC', 'WD'])

export function normalizeRarity(value: unknown): Rarity {
  if (typeof value !== 'string') return 'Unknown'
  return RARITY_MAP[value.trim().toLocaleLowerCase('en-US')] ?? 'Unknown'
}

export function deriveAvailability(rarity: Rarity): Availability {
  if (rarity === 'None' || rarity === 'Common' || rarity === 'Uncommon') return 'Available'
  if (rarity === 'Rare' || rarity === 'Very Rare') return 'Limited'
  return 'Unavailable'
}

export function deriveBasePriceGp(entity: ProcessedItemEntity, rarity: Rarity): number | null {
  if (typeof entity.value === 'number' && Number.isFinite(entity.value) && entity.value >= 0) return entity.value / 100
  return FALLBACK_PRICE_GP[rarity] ?? null
}

function sourceFallbacks(entity: ProcessedItemEntity, abbreviation: string): string[] {
  const modern = entity._catalogEdition === 'one'
  if (MAGIC_TYPE_SOURCES.has(abbreviation)) return modern ? ['XDMG', 'DMG'] : ['DMG', 'XDMG']
  return modern ? ['XPHB', 'PHB'] : ['PHB', 'XPHB']
}

function typeDefinition(entity: ProcessedItemEntity, index: ReadonlyMap<string, RawItemType>): RawItemType | undefined {
  if (typeof entity.type !== 'string') return undefined
  const abbreviation = entity.type.split('|')[0]
  return lookupUid(index, entity.type, { fallbackSources: sourceFallbacks(entity, abbreviation) })
}

function propertyDefinition(entity: ProcessedItemEntity, uid: string, index: ReadonlyMap<string, RawItemProperty>): RawItemProperty | undefined {
  return lookupUid(index, uid, { fallbackSources: entity._catalogEdition === 'one' ? ['XPHB', 'XDMG', 'PHB', 'DMG'] : ['PHB', 'DMG', 'XPHB', 'XDMG'] })
}

function propertyName(property: RawItemProperty): string {
  if (typeof property.name === 'string') return property.name
  const first = property.entries?.[0]
  if (isJsonRecord(first) && typeof first.name === 'string') return first.name
  return property.abbreviation
}

function stablePart(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown'
}

export function createItemId(entity: ProcessedItemEntity): string {
  const parts = [entity._catalogOrigin, entity.source, entity.name]
  if (entity._catalogBase) parts.push('base', entity._catalogBase.source, entity._catalogBase.name)
  if (entity._catalogVariant) parts.push('variant', entity._catalogVariant.source, entity._catalogVariant.name)
  return parts.map(stablePart).join('--')
}

function formatWeight(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)} lb`
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const trimmed = value.trim()
    const key = trimmed.toLocaleLowerCase('en-US')
    if (!trimmed || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function auxiliaryProperties(entity: ProcessedItemEntity, indexes: NormalizationIndexes, type: RawItemType | undefined): { properties: string[]; tags: string[] } {
  const properties: string[] = []
  const tags: string[] = []

  if (type) {
    tags.push(type.name)
    properties.push(...renderEntryTree(type.entries, entity, indexes.itemEntries))
  }

  const propertyUids = Array.isArray(entity.property) ? entity.property.filter((value): value is string => typeof value === 'string') : []
  for (const uid of propertyUids) {
    const definition = propertyDefinition(entity, uid, indexes.itemProperties)
    if (!definition) {
      tags.push(uid)
      continue
    }
    const name = propertyName(definition)
    tags.push(name)
    const rendered = renderEntryTree(definition.entries, entity, indexes.itemEntries)
    if (rendered.length) properties.push(`${name}: ${rendered[0]}`)
  }

  const masteries = Array.isArray(entity.mastery) ? entity.mastery.filter((value): value is string => typeof value === 'string') : []
  for (const uid of masteries) {
    const mastery = lookupUid(indexes.itemMasteries, uid, { fallbackSources: ['XPHB'] })
    if (!mastery) continue
    tags.push(mastery.name)
    const rendered = renderEntryTree(mastery.entries, entity, indexes.itemEntries)
    if (rendered.length) properties.push(`Mastery — ${mastery.name}: ${rendered[0]}`)
  }

  if (typeof entity.type === 'string') {
    const additional = indexes.typeAdditionalEntries.get(entity.type.toLocaleLowerCase('en-US'))
    properties.push(...renderEntryTree(additional, entity, indexes.itemEntries))
  }
  if (typeof entity.dmg1 === 'string') properties.push(`${entity.dmg1} ${DAMAGE_TYPES[String(entity.dmgType)] ?? String(entity.dmgType ?? '').toLocaleLowerCase()} damage`.trim())
  if (typeof entity.ac === 'number') properties.push(`Armor Class ${entity.ac}`)
  return { properties, tags }
}

export function normalizeItem(entity: ProcessedItemEntity, indexes: NormalizationIndexes): Item {
  if (!entity.name.trim() || !entity.source.trim()) throw new Error('Cannot normalize an item without name and source')
  const rarity = normalizeRarity(entity.rarity)
  const type = typeDefinition(entity, indexes.itemTypes)
  const entryLines = resolveEntityEntries(entity, indexes.itemEntries)
  const auxiliary = auxiliaryProperties(entity, indexes, type)
  const description = entryLines[0] ?? `${type?.name ?? (entity._catalogOrigin === 'itemGroup' ? 'Item group' : 'Item')} from ${entity.source}.`
  const category = resolveCategory(entity, description)
  const rawRarity = typeof entity.rarity === 'string' ? entity.rarity.toLocaleLowerCase('en-US') : ''
  const itemType = entity._catalogOrigin === 'baseitem' || rawRarity === 'none' || rawRarity === 'unknown' ? 'Common' : 'Magic'
  const subtype = type?.name ?? (entity._catalogOrigin === 'itemGroup' ? 'Item group' : entity.wondrous === true ? 'Wondrous item' : 'Other')

  const rawTags = [
    entity.source,
    subtype,
    entity._catalogOrigin,
    ...auxiliary.tags,
    ...(Array.isArray(entity.miscTags) ? entity.miscTags.map(String) : []),
    ...(Array.isArray(entity.focus) ? entity.focus.map(String) : []),
    ...(Array.isArray(entity.resist) ? entity.resist.map((value) => `${String(value)} resistance`) : []),
    typeof entity.dmgType === 'string' ? DAMAGE_TYPES[entity.dmgType] ?? entity.dmgType : '',
  ]

  return {
    id: createItemId(entity),
    name: entity.name,
    icon: CATEGORY_ICONS[category],
    type: itemType,
    rarity,
    category,
    subtype,
    availability: deriveAvailability(rarity),
    basePriceGp: deriveBasePriceGp(entity, rarity),
    weight: formatWeight(entity.weight),
    description,
    properties: unique([...entryLines.slice(1), ...auxiliary.properties]),
    tags: unique(rawTags.map((tag) => tag.trim().toLocaleLowerCase('en-US'))),
    attunement: entity.reqAttune === true || (typeof entity.reqAttune === 'string' && entity.reqAttune.trim().length > 0),
    source: entity.source,
    edition: entity._catalogEdition as ItemEdition,
    origin: entity._catalogOrigin,
  }
}
