import type { Item } from '../types'
import { normalizeSource } from './sources'

export function applySourceSelection(items: readonly Item[], selectedSources: readonly string[]): Item[] {
    const selectedSourceSet = new Set(selectedSources.map(normalizeSource))
    const visible = (source: string) => selectedSourceSet.has(normalizeSource(source))
    const filterItem = (item: Item): Item[] => {
        if (!visible(item.source)) return []
        if (item.groupOptions) {
            const groupOptions = item.groupOptions.flatMap((option) => visible(option.source)
                ? filterItem(option.resolvedItem).map((resolvedItem) => ({ ...option, resolvedItem })) : [])
            if (item.groupOptions.length && !groupOptions.length) return []
            return [{ ...item, groupOptions, availableRarities: [...new Set(groupOptions.map((option) => option.resolvedItem.rarity))] }]
        }
        if (!item.variantOptions) return [item]
        const variantOptions = item.variantOptions.filter((option) => visible(option.baseSource))
        if (item.variantOptions.length && !variantOptions.length) return []
        return variantOptions.length === item.variantOptions.length ? [item] : [{ ...item, variantOptions }]
    }
    return items.flatMap(filterItem)
}
