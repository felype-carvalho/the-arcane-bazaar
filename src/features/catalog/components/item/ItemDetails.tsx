import { type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { BookOpen, Coins, Tag, X } from 'lucide-react'
import type { Item, PricingModifiers, VariantBaseOption } from '../../types'
import { BaseItemSelector } from './BaseItemSelector'
import { itemTypeLabel, RarityBadge } from './ItemBadges'
import { PriceCalculator } from '../pricing/PriceCalculator'
import { SourceChip } from './SourceChip'

interface ItemDetailsProps {
    item: Item
    selectedVariantOption?: VariantBaseOption
    onVariantOptionSelect: (optionId: string) => void
    onOpenModal: (item: Item) => void
    onClose?: () => void
    modifiers: PricingModifiers
    setModifiers: Dispatch<SetStateAction<PricingModifiers>>
    manualPrice: string
    setManualPrice: (value: string) => void
}

export function ItemDetails({ item, selectedVariantOption, onVariantOptionSelect, onOpenModal, onClose, modifiers, setModifiers, manualPrice, setManualPrice }: ItemDetailsProps) {
    const sheetItem = selectedVariantOption?.resolvedItem ?? item

    return (
        <aside className="arcane-scrollbar h-full overflow-y-auto bg-panel" aria-label={`${item.name} details`}>
            <div className="border-b border-border px-5 py-5">
                <div className="flex items-start gap-4">
                    <div className="item-icon-tile" aria-hidden="true">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h2 className="font-display text-base leading-6 text-gold-bright">{item.name}</h2>
                                <SourceChip source={item.source} />
                            </div>
                            {onClose && <button className="icon-button shrink-0" onClick={onClose} aria-label="Close item details"><X size={18} /></button>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="type-pill"><span aria-hidden="true">{item.type === 'Magic' ? '✨' : '📦'}</span>{itemTypeLabel(item.type)}</span>
                            <RarityBadge rarity={item.rarity} />
                        </div>
                    </div>
                </div>
                {/* <p className="mt-4 font-display text-[11px] leading-6 text-gold-bright/90">{item.description}</p> */}
            </div>

            {item.variantOptions && <BaseItemSelector item={item} selectedOption={selectedVariantOption} onSelect={onVariantOptionSelect} />}

            <div className="border-b border-border px-5 py-4">
                <button className="primary-button mt-4 w-full" onClick={() => onOpenModal(sheetItem)}><BookOpen size={15} /> View full item sheet</button>
            </div>

            <PriceCalculator item={item} effectiveItem={selectedVariantOption?.resolvedItem} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} />
        </aside>
    )
}

export function DetailFact({ label, value }: { label: string, value: ReactNode }) {
    return <div><p className="eyebrow">{label}</p><p className="mt-1.5 font-display text-[11px] font-semibold leading-5 text-cream">{value}</p></div>
}
