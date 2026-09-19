import { type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { BookOpen, X } from 'lucide-react'
import type { Item, ItemGroupOption, PricingModifiers, VariantBaseOption } from '../../types'
import { resolveItemSelection } from '../../model/items/resolve-item-selection'
import { GroupOptionSelector } from './GroupOptionSelector'
import { BaseItemSelector } from './BaseItemSelector'
import { itemTypeLabel, RarityBadge } from './ItemBadges'
import { PriceCalculator } from '../pricing/PriceCalculator'
import { SourceChip } from './SourceChip'

interface ItemDetailsProps {
    item: Item
    selectedGroupOption?: ItemGroupOption
    onGroupOptionSelect: (optionId: string) => void
    selectedVariantOption?: VariantBaseOption
    onVariantOptionSelect: (optionId: string) => void
    onOpenModal: (item: Item) => void
    onClose?: () => void
    modifiers: PricingModifiers
    setModifiers: Dispatch<SetStateAction<PricingModifiers>>
    manualPrice: string
    setManualPrice: (value: string) => void
}

export function ItemDetails({ item, selectedGroupOption, onGroupOptionSelect, selectedVariantOption, onVariantOptionSelect, onOpenModal, onClose, modifiers, setModifiers, manualPrice, setManualPrice }: ItemDetailsProps) {
    const { effectiveItem: sheetItem, groupResolvedItem, pendingSelection } = resolveItemSelection(item, selectedGroupOption?.id, selectedVariantOption?.id)

    return (
        <aside className="arcane-scrollbar h-full overflow-y-auto bg-panel" aria-label={`${sheetItem.name} details`}>
            <div className="border-b border-border px-5 py-5">
                <div className="flex items-start gap-4">
                    <div className="item-icon-tile" aria-hidden="true">{sheetItem.icon}</div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h2 className="font-display text-base leading-6 text-gold-bright">{sheetItem.name}</h2>
                                <SourceChip source={sheetItem.source} />
                            </div>
                            {onClose && <button className="icon-button shrink-0" onClick={onClose} aria-label="Close item details"><X size={18} /></button>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="type-pill"><span aria-hidden="true">{sheetItem.type === 'Magic' ? '✨' : '📦'}</span>{itemTypeLabel(sheetItem.type)}</span>
                            <RarityBadge rarity={sheetItem.rarity} />
                        </div>
                    </div>
                </div>
                {/* <p className="mt-4 font-display text-[11px] leading-6 text-gold-bright/90">{item.description}</p> */}
            </div>

            {sheetItem.id !== item.id && <p className="px-5 pt-3 text-xs text-muted">{item.name}</p>}
            {item.groupOptions && <GroupOptionSelector item={item} selectedOption={selectedGroupOption} onSelect={onGroupOptionSelect} />}
            {groupResolvedItem.variantOptions && <BaseItemSelector item={groupResolvedItem} selectedOption={selectedVariantOption} onSelect={onVariantOptionSelect} />}

            <div className="border-b border-border px-5 py-4">
                <button className="primary-button mt-4 w-full" disabled={Boolean(pendingSelection)} onClick={() => onOpenModal(sheetItem)}><BookOpen size={15} /> View full item sheet</button>
            </div>

            <PriceCalculator item={item} effectiveItem={sheetItem} pendingSelection={pendingSelection} selectedOption={selectedVariantOption} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} />
        </aside>
    )
}

export function DetailFact({ label, value }: { label: string, value: ReactNode }) {
    return <div><p className="eyebrow">{label}</p><p className="mt-1.5 font-display text-[11px] font-semibold leading-5 text-cream">{value}</p></div>
}
