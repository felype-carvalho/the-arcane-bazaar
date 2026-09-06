import type { Category, Item, ItemOrigin, VariantBaseOption } from '../../types'
import { CATEGORIES, CATEGORY_ICONS } from './categories'
import { buildVariantFamilies, resolveVariantPriceGp } from './build-variants'
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

function magicVariantSource(variant: ItemJsonFiles['variants']['magicvariant'][number]): string {
  if (typeof variant.source === 'string') return variant.source
  if (typeof variant.inherits?.source === 'string') return variant.inherits.source
  throw new Error(`magicvariant: ${variant.name} has no source`)
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
  const byOrigin = emptyRecord<ItemOrigin>(['item', 'itemGroup', 'baseitem', 'genericVariant', 'specificVariant'])
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
  const variantsWithSources = files.variants.magicvariant.map((variant) => ({ ...structuredClone(variant), source: magicVariantSource(variant) }))
  const resolvedVariants = resolveCopies(variantsWithSources, { collectionName: 'magicvariant' })
  const variantFamilies = buildVariantFamilies(files.base.baseitem, resolvedVariants)
  const specificVariants = variantFamilies.flatMap((family) => family.combinations.map((combination) => combination.specific))
  const primaryProcessed: ProcessedItemEntity[] = [
    ...resolvedItems.map((entity) => processEntity(entity, 'item')),
    ...files.items.itemGroup.map((entity) => processEntity(entity, 'itemGroup')),
    ...files.base.baseitem.map((entity) => processEntity(entity, 'baseitem')),
  ]
  const indexes = buildIndexes(files, resolvedTypes)
  const primaryItems = primaryProcessed.map((entity) => normalizeItem(entity, indexes))
  const baseItemsByIdentity = new Map(primaryItems
    .filter((item) => item.origin === 'baseitem')
    .map((item) => [`${item.name.toLocaleLowerCase('en-US')}|${item.source.toLocaleLowerCase('en-US')}`, item]))

  const genericItems = variantFamilies.map((family): Item => {
    const normalizedGeneric = normalizeItem(family.generic, indexes)
    const variantPriceGp = normalizedGeneric.basePriceGp
    const variantOptions = family.combinations.map((combination): VariantBaseOption => {
      const identity = `${combination.base.name.toLocaleLowerCase('en-US')}|${combination.base.source.toLocaleLowerCase('en-US')}`
      const baseItem = baseItemsByIdentity.get(identity) ?? normalizeItem(processEntity(combination.base, 'baseitem'), indexes)
      const normalizedSpecific = normalizeItem(combination.specific, indexes)
      const effectivePriceGp = resolveVariantPriceGp(family.variant, combination.base, baseItem.basePriceGp, variantPriceGp)
      const optionVariantPriceGp = effectivePriceGp != null && baseItem.basePriceGp != null
        ? effectivePriceGp - baseItem.basePriceGp
        : variantPriceGp
      const resolvedItem = { ...normalizedSpecific, basePriceGp: effectivePriceGp }
      return {
        id: normalizedSpecific.id,
        baseItemId: baseItem.id,
        baseName: baseItem.name,
        baseSource: baseItem.source,
        basePriceGp: baseItem.basePriceGp,
        variantPriceGp: optionVariantPriceGp,
        effectivePriceGp,
        resolvedItem,
      }
    })

    const categories = new Set(variantOptions.map((option) => option.resolvedItem.category))
    const category = categories.size === 1 ? [...categories][0] : normalizedGeneric.category
    const searchableBaseTags = variantOptions.flatMap((option) => [option.baseName.toLocaleLowerCase('en-US'), option.baseSource.toLocaleLowerCase('en-US')])
    return {
      ...normalizedGeneric,
      category,
      icon: CATEGORY_ICONS[category],
      basePriceGp: null,
      variantPriceGp,
      variantOptions,
      tags: [...new Set([...normalizedGeneric.tags, ...searchableBaseTags])],
    }
  })
  const items = [...primaryItems, ...genericItems]

  const ids = new Map<string, string>()
  const optionIds = new Set<string>()
  for (const item of items) {
    const existing = ids.get(item.id)
    if (existing) throw new Error(`Catalog ID collision: ${item.id} (${existing} and ${item.name}|${item.source})`)
    ids.set(item.id, `${item.name}|${item.source}`)
    if (!CATEGORIES.includes(item.category)) throw new Error(`Invalid category ${item.category} for ${item.name}|${item.source}`)
    for (const option of item.variantOptions ?? []) {
      if (optionIds.has(option.id)) throw new Error(`Variant option ID collision: ${option.id}`)
      optionIds.add(option.id)
    }
  }

  const diagnosticProcessed = [...primaryProcessed, ...variantFamilies.map((family) => family.generic), ...specificVariants]
  options.onDiagnostics?.(createDiagnostics(items, diagnosticProcessed, specificVariants.length, files, options))
  return items
}
