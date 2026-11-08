import { useInterfaceTranslation } from '@/app/i18n'
import { Tooltip } from '@/components/ui/Tooltip'
import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { BookOpen, X } from 'lucide-react'
import type { Item, ItemGroupOption, PricingModifiers, VariantBaseOption } from '../../types'
import { resolveItemSelection } from '../../model/items/resolve-item-selection'
import { itemName, itemNameTooltip } from '../../model/item-translations'
import { GroupOptionSelector } from './GroupOptionSelector'
import { BaseItemSelector } from './BaseItemSelector'
import { itemTypeLabel, RarityBadge } from './ItemBadges'
import { PriceCalculator } from '../pricing/PriceCalculator'
import { SourceChip } from './SourceChip'
import { getItemImages, type ItemImage } from '../../model/items/item-images'
import { ItemImageViewer } from './ItemImageViewer'

function ItemDetailsThumbnail({ item }: { item: Item }) {
    const { t, language } = useInterfaceTranslation()
    const thumbnailRef = useRef<HTMLButtonElement>(null)
    const [images, setImages] = useState<ItemImage[]>([])
    const [imageFailed, setImageFailed] = useState(false)
    const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
    const name = itemName(item, language)
    const hasItemImage = images.length > 0 && !imageFailed

    useEffect(() => {
        let active = true
        getItemImages(item.name, item.source, item.imageFallback)
            .then((result) => { if (active) setImages(result) })
            .catch(() => { if (active) setImages([]) })
        return () => { active = false }
    }, [item.name, item.source, item.imageFallback])

    return <>
        <div className="item-icon-tile overflow-hidden">
            {hasItemImage
                ? <button ref={thumbnailRef} type="button" className="grid size-full min-h-0 min-w-0 cursor-zoom-in place-items-center rounded-[7px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-bright" aria-label={t("images.open", { name })} onClick={() => setActiveImageIndex(0)}>
                    <img className="block size-full min-h-0 min-w-0 object-contain p-1" src={images[0].src} alt={name} onError={() => setImageFailed(true)} />
                </button>
                : <span aria-hidden="true">{item.icon}</span>}
        </div>
        {activeImageIndex !== null && hasItemImage && <ItemImageViewer itemName={name} images={images} activeIndex={activeImageIndex} returnFocusRef={thumbnailRef} onIndexChange={setActiveImageIndex} onClose={() => setActiveImageIndex(null)} />}
    </>
}

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
    const { t, label, language } = useInterfaceTranslation()
    const { effectiveItem: sheetItem, groupResolvedItem, pendingSelection } = resolveItemSelection(item, selectedGroupOption?.id, selectedVariantOption?.id)

    return (
        <aside className="arcane-scrollbar h-full overflow-y-auto bg-panel" aria-label={t("item.detailsLabel", { name: itemName(sheetItem, language) })}>
            <div className="px-5 py-5">
                <div className="flex items-start gap-4">
                    <ItemDetailsThumbnail key={JSON.stringify([sheetItem.id, sheetItem.name, sheetItem.source, sheetItem.imageFallback])} item={sheetItem} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <Tooltip content={itemNameTooltip(sheetItem)}><h2 className="font-display text-base leading-6 text-gold-bright">{itemName(sheetItem, language)}</h2></Tooltip>
                                <SourceChip source={sheetItem.source} />
                            </div>
                            {onClose && <button className="icon-button shrink-0" onClick={onClose} aria-label={t("item.closeDetails")}><X size={18} /></button>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="type-pill"><span aria-hidden="true">{sheetItem.type === 'Magic' ? '✨' : '📦'}</span>{label(itemTypeLabel(sheetItem.type))}</span>
                            <RarityBadge rarity={sheetItem.rarity} />
                        </div>
                    </div>
                </div>
                {/* <p className="mt-4 font-display text-[11px] leading-6 text-gold-bright/90">{item.description}</p> */}
            </div>

            {sheetItem.id !== item.id && <p className="px-5 pt-3 text-xs text-muted"><Tooltip content={itemNameTooltip(item)}><span>{itemName(item, language)}</span></Tooltip></p>}
            {item.groupOptions && <GroupOptionSelector item={item} selectedOption={selectedGroupOption} onSelect={onGroupOptionSelect} />}
            {groupResolvedItem.variantOptions && <BaseItemSelector item={groupResolvedItem} selectedOption={selectedVariantOption} onSelect={onVariantOptionSelect} />}

            <div className="px-5 pb-4 mt-4">
                <button className="primary-button w-full" disabled={Boolean(pendingSelection)} onClick={() => onOpenModal(sheetItem)}><BookOpen size={15} /> {t("item.openSheet")}</button>
            </div>

            <PriceCalculator item={item} effectiveItem={sheetItem} pendingSelection={pendingSelection} selectedOption={selectedVariantOption} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} />
        </aside>
    )
}

export function DetailInformation({ label, value }: { label: string, value: ReactNode }) {
    return <div><p className="eyebrow">{label}</p><p className="mt-1.5 font-display text-[11px] font-semibold leading-5 text-cream">{value}</p></div>
}
