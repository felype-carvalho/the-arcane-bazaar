import portuguese from '../data/translations/pt-BR'
import type { CatalogTranslations, Item, ItemGroupOption, VariantBaseOption } from '../types'

export type { CatalogTranslations, ItemTranslation } from '../types'

export const catalogTranslations: CatalogTranslations = portuguese

export function itemName(item: Pick<Item, 'id' | 'name'>, language: string): string {
    return language === 'pt-BR' ? catalogTranslations.items[item.id]?.name || item.name : item.name
}

function nameTooltip(name: (language: string) => string): string {
    return `English: ${name('en-US')}\nPortuguês: ${name('pt-BR')}`
}

export function itemNameTooltip(item: Pick<Item, 'id' | 'name'>): string {
    return nameTooltip((language) => itemName(item, language))
}

export function baseOptionNameTooltip(option: VariantBaseOption): string {
    return nameTooltip((language) => baseOptionName(option, language))
}

export function groupOptionNameTooltip(option: ItemGroupOption): string {
    return nameTooltip((language) => groupOptionName(option, language))
}

export function formatCatalogItemName(name: string): string {
    const match = name.match(/^(\+[1-3])\s+(.+)$/)
    return match ? `${match[2]}, ${match[1]}` : name
}

export function itemText(item: Pick<Item, 'id'>, text: string, language: string): string {
    if (language !== 'pt-BR') return text
    if (/^[\s\d.,+−–\-/×%()½¼¾⅓⅔⅛⅜⅝⅞d]+$/i.test(text)) return text
    return catalogTranslations.items[item.id]?.texts?.[text] || catalogTranslations.shared[text] || text
}

export function baseOptionName(option: VariantBaseOption, language: string): string {
    return itemName({ id: option.baseItemId, name: option.baseName }, language)
}

export function groupOptionName(option: ItemGroupOption, language: string): string {
    if (option.kind === 'inferredInitialStage') return language === 'pt-BR' ? 'Inicial' : option.label
    return itemName({ id: option.resolvedItem.id, name: option.label }, language)
}

export function configurationName(group: ItemGroupOption | undefined, base: VariantBaseOption | undefined, language: string): string {
    return [group && groupOptionName(group, language), base && `${baseOptionName(base, language)} (${base.baseSource})`].filter(Boolean).join(' → ')
}

/** A presentation copy: never pass this object to pricing, selection or artwork lookup. */
export function presentItem(item: Item, language: string): Item {
    if (language !== 'pt-BR') return item
    const text = (value: string) => itemText(item, value, language)
    const information = (entries: Item['weaponInformation']) => entries?.map((entry) => ({
        ...entry,
        // These structured costs have their own locale and unit-aware renderer.
        value: ['Personal Travel Cost', 'Shipping Cost'].includes(entry.label) ? entry.value : text(entry.value),
    }))
    return {
        ...item,
        name: itemName(item, language),
        subtype: text(item.subtype),
        description: text(item.description),
        attunementRequirement: item.attunementRequirement && text(item.attunementRequirement),
        characteristics: item.characteristics?.map(text),
        properties: item.properties.map(text),
        descriptionBlocks: item.descriptionBlocks?.map((block) => block.type === 'paragraph'
            ? { ...block, text: text(block.text) }
            : { ...block, caption: block.caption && text(block.caption), columns: block.columns.map(text), rows: block.rows.map((row) => row.map(text)) }),
        weaponInformation: information(item.weaponInformation),
        armorInformation: information(item.armorInformation),
        vehicleInformation: information(item.vehicleInformation),
        mountInformation: information(item.mountInformation),
        spellcastingFocusInformation: information(item.spellcastingFocusInformation),
    }
}

export function normalizeCatalogSearch(value: string): string {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim()
}

const searchCache = new WeakMap<Item, string>()

export function itemSearchText(item: Item): string {
    const cached = searchCache.get(item)
    if (cached !== undefined) return cached
    const names = [item.name, itemName(item, 'pt-BR'), ...item.tags]
    for (const option of item.groupOptions ?? []) names.push(option.label, groupOptionName(option, 'pt-BR'), itemSearchText(option.resolvedItem))
    for (const option of item.variantOptions ?? []) names.push(option.baseName, baseOptionName(option, 'pt-BR'), itemSearchText(option.resolvedItem))
    const result = names.map(normalizeCatalogSearch).join('\n')
    searchCache.set(item, result)
    return result
}
