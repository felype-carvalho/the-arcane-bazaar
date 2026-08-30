import type { Category, Item, ItemOrigin } from '../../types'
import { CATEGORIES } from './categories'
import { buildSpecificVariants } from './build-variants'
import { buildEntityIndex, parseUid } from './indexes'
import { validateItemsBaseFile, validateItemsFile, validateMagicVariantsFile } from './load-json'
import { normalizeItem, type NormalizationIndexes } from './normalize-item'
import type { ItemJsonFiles, ProcessedItemEntity, RawItemEntity, RawItemType } from './raw-types'
import { createItemEntryIndex } from './resolve-entries'
import { resolveCopies } from './resolve-copy'

export interface CatalogDiagnostics {
  total: number
  byOrigin: Record<ItemOrigin, number>
  byCategory: Record<Category, number>
  otherPercent: number
  specificVariants: number
  genericVariantTemplates: number
  unknownTypes: string[]
  unresolvedReferences: string[]
  idCollisions: string[]
}

export interface BuildCatalogOptions {
  includeGenericVariantsInDiagnostics?: boolean
  onDiagnostics?: (diagnostics: CatalogDiagnostics) => void
}

function processEntity(entity: RawItemEntity, origin: Exclude<ItemOrigin, 'specificVariant'>): ProcessedItemEntity {
  return {
    ...structuredClone(entity),
    _catalogOrigin: origin,
    _catalogEdition: entity.edition === 'classic' || entity.edition === 'one' ? entity.edition : 'unspecified',
  }
}

function buildIndexes(files: ItemJsonFiles, itemTypes: RawItemType[]): NormalizationIndexes {
  const typeAdditionalEntries = new Map<string, unknown[]>()
  for (const entry of files.base.itemTypeAdditionalEntries ?? []) {
    if (typeof entry.appliesTo === 'string' && Array.isArray(entry.entries)) typeAdditionalEntries.set(entry.appliesTo.toLocaleLowerCase('en-US'), entry.entries)
  }
  return {
    itemEntries: createItemEntryIndex(files.base.itemEntry),
    itemTypes: buildEntityIndex(itemTypes, 'abbreviation'),
    itemProperties: buildEntityIndex(files.base.itemProperty, 'abbreviation'),
    itemMasteries: buildEntityIndex(files.base.itemMastery),
    typeAdditionalEntries,
  }
}

function emptyRecord<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>
}

function createDiagnostics(items: Item[], processed: ProcessedItemEntity[], specificVariants: number, files: ItemJsonFiles, options: BuildCatalogOptions): CatalogDiagnostics {
  const byOrigin = emptyRecord<ItemOrigin>(['item', 'itemGroup', 'baseitem', 'specificVariant'])
  const byCategory = emptyRecord(CATEGORIES)
  for (const item of items) {
    byOrigin[item.origin]++
    byCategory[item.category]++
  }
  const knownTypeAbbreviations = new Set(files.base.itemType.map((type) => type.abbreviation.toLocaleUpperCase('en-US')))
  const unknownTypes = [...new Set(processed.flatMap((entity) => {
    if (typeof entity.type !== 'string') return []
    const abbreviation = parseUid(entity.type).name.toLocaleUpperCase('en-US')
    return knownTypeAbbreviations.has(abbreviation) ? [] : [entity.type]
  }))].sort()

  return {
    total: items.length,
    byOrigin,
    byCategory,
    otherPercent: items.length ? (byCategory.Other / items.length) * 100 : 0,
    specificVariants,
    genericVariantTemplates: options.includeGenericVariantsInDiagnostics ? files.variants.magicvariant.length : 0,
    unknownTypes,
    unresolvedReferences: [],
    idCollisions: [],
  }
}

export function buildCatalog(input: ItemJsonFiles, options: BuildCatalogOptions = {}): Item[] {
  const files: ItemJsonFiles = {
    items: validateItemsFile(input.items),
    base: validateItemsBaseFile(input.base),
    variants: validateMagicVariantsFile(input.variants),
  }
  const resolvedItems = resolveCopies(files.items.item, { collectionName: 'item' })
  const resolvedTypes = resolveCopies(files.base.itemType, { identityField: 'abbreviation', collectionName: 'itemType' })
  const specificVariants = buildSpecificVariants(files.base.baseitem, files.variants.magicvariant)
  const processed: ProcessedItemEntity[] = [
    ...resolvedItems.map((entity) => processEntity(entity, 'item')),
    ...files.items.itemGroup.map((entity) => processEntity(entity, 'itemGroup')),
    ...files.base.baseitem.map((entity) => processEntity(entity, 'baseitem')),
    ...specificVariants,
  ]
  const indexes = buildIndexes(files, resolvedTypes)
  const items = processed.map((entity) => normalizeItem(entity, indexes))

  const ids = new Map<string, string>()
  for (const item of items) {
    const existing = ids.get(item.id)
    if (existing) throw new Error(`Catalog ID collision: ${item.id} (${existing} and ${item.name}|${item.source})`)
    ids.set(item.id, `${item.name}|${item.source}`)
    if (!CATEGORIES.includes(item.category)) throw new Error(`Invalid category ${item.category} for ${item.name}|${item.source}`)
  }

  options.onDiagnostics?.(createDiagnostics(items, processed, specificVariants.length, files, options))
  return items
}
