import type { Item } from '../types'
import { normalizeSource } from './sources'

export function applySourceSelection(items: readonly Item[], selectedSources: readonly string[]): Item[] {
  const selectedSourceSet = new Set(selectedSources.map(normalizeSource))

  return items.flatMap((item) => {
    if (!selectedSourceSet.has(normalizeSource(item.source))) return []
    if (!item.variantOptions) return [item]

    const variantOptions = item.variantOptions.filter((option) => selectedSourceSet.has(normalizeSource(option.baseSource)))
    if (item.origin === 'genericVariant' && item.variantOptions.length > 0 && variantOptions.length === 0) return []
    if (variantOptions.length === item.variantOptions.length) return [item]

    return [{ ...item, variantOptions }]
  })
}
