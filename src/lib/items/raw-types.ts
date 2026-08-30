export type JsonRecord = Record<string, unknown>

export interface RawMeta extends JsonRecord {
  internalCopies?: string[]
}

export interface RawCopy extends JsonRecord {
  name?: string
  source?: string
  abbreviation?: string
  _preserve?: Record<string, boolean>
  _mod?: Record<string, unknown>
}

export interface RawItemEntity extends JsonRecord {
  name: string
  source: string
  type?: string
  rarity?: string
  edition?: 'classic' | 'one'
  entries?: unknown[]
  additionalEntries?: unknown[]
  _copy?: RawCopy
}

export interface RawNamedEntity extends JsonRecord {
  name: string
  source: string
  entries?: unknown[]
}

export interface RawItemType extends RawNamedEntity {
  abbreviation: string
  _copy?: RawCopy
}

export interface RawItemProperty extends JsonRecord {
  name?: string
  abbreviation: string
  source: string
  template?: string
  entries?: unknown[]
}

export interface RawItemEntry extends RawNamedEntity {
  entriesTemplate: unknown[]
}

export interface RawMagicVariant extends JsonRecord {
  name: string
  edition?: 'classic'
  type?: string
  requires?: JsonRecord[]
  excludes?: JsonRecord
  inherits: JsonRecord
}

export interface RawItemsFile extends JsonRecord {
  _meta?: RawMeta
  item: RawItemEntity[]
  itemGroup: RawItemEntity[]
}

export interface RawItemsBaseFile extends JsonRecord {
  _meta?: RawMeta
  baseitem: RawItemEntity[]
  itemProperty: RawItemProperty[]
  itemType: RawItemType[]
  itemTypeAdditionalEntries?: Array<JsonRecord & { appliesTo?: string; entries?: unknown[] }>
  itemEntry: RawItemEntry[]
  itemMastery: RawNamedEntity[]
}

export interface RawMagicVariantsFile extends JsonRecord {
  magicvariant: RawMagicVariant[]
  linkedLootTables?: unknown
}

export interface ItemJsonFiles {
  items: RawItemsFile
  base: RawItemsBaseFile
  variants: RawMagicVariantsFile
}

export interface ProcessedItemEntity extends RawItemEntity {
  _catalogOrigin: 'item' | 'itemGroup' | 'baseitem' | 'specificVariant'
  _catalogEdition: 'classic' | 'one' | 'unspecified'
  _catalogBase?: { name: string; source: string }
  _catalogVariant?: { name: string; source: string }
}

export function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
