import type { Item } from '../../types'

export function resolveItemSelection(item: Item, groupOptionId = '', baseOptionId = '') {
    const selectedGroupOption = item.groupOptions?.find((option) => option.id === groupOptionId)
    const groupResolvedItem = selectedGroupOption?.resolvedItem ?? item
    const selectedBaseOption = (!item.groupOptions || selectedGroupOption)
        ? groupResolvedItem.variantOptions?.find((option) => option.id === baseOptionId)
            ?? (groupResolvedItem.variantOptions?.length === 1 ? groupResolvedItem.variantOptions[0] : undefined)
        : undefined
    const pendingSelection: 'groupOption' | 'baseItem' | undefined = item.groupOptions && !selectedGroupOption
        ? 'groupOption'
        : groupResolvedItem.variantOptions && !selectedBaseOption ? 'baseItem' : undefined
    return {
        selectedGroupOption,
        groupResolvedItem,
        selectedBaseOption,
        effectiveItem: selectedBaseOption?.resolvedItem ?? groupResolvedItem,
        pendingSelection,
        configurationSummary: [selectedGroupOption?.label, selectedBaseOption ? `${selectedBaseOption.baseName} (${selectedBaseOption.baseSource})` : undefined].filter(Boolean).join(' → '),
    }
}
