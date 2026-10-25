import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Axe, BicepsFlexed, BookOpen, BowArrow, CircleGauge, CircleDashedCheck, Coins, HandCoins, HatGlasses, HeartPlus, MessageCircleCheck, Package, Package2, Panda, Shield, ShieldCog, ShieldLock, Sparkles, Sword, Swords, TableProperties, UserStar, WandSparkles, Weight, X } from 'lucide-react'
import type { Item, VariantBaseOption } from '../../types'
import type { ItemDescriptionBlock, ItemInformation } from '../../types/catalog'
import { getSourceName } from '../../model/sources'
import { getItemImages, type ItemImage } from '../../model/items/item-images'
import { CurrencyDisplay } from '../pricing/CurrencyDisplay'
import { RarityBadge, TypeMark } from './ItemBadges'
import { ItemCategories } from './ItemCategories'
import { ItemImageViewer } from './ItemImageViewer'
import { SourceChip } from './SourceChip'
import '@fontsource/inter/latin-400-italic.css'

const sectionHeadingClass = 'mb-[14px] font-display text-sm font-semibold tracking-[0.06em] text-gold-bright'
const summarySectionClass = 'border-t border-border pt-5'
const noteClass = 'mt-3 text-[11px] leading-[1.6] text-silver'

const weaponIcons: Record<string, ReactNode> = {
    'Base Damage': <Sword aria-hidden="true" />,
    'Weapon Type': <Axe aria-hidden="true" />,
    Properties: <TableProperties aria-hidden="true" />,
    Range: <BowArrow aria-hidden="true" />,
    'Magic attack / damage bonus': <WandSparkles aria-hidden="true" />,
}

const armorIcons: Record<string, ReactNode> = {
    'Armor type': <ShieldCog aria-hidden="true" />,
    'Strength requirement': <BicepsFlexed aria-hidden="true" />,
    Stealth: <HatGlasses aria-hidden="true" />,
    'Magic AC bonus': <WandSparkles aria-hidden="true" />,
}

const vehicleIcons: Record<string, ReactNode> = {
    Speed: <CircleGauge aria-hidden="true" />,
    'Carrying Capacity': <Package aria-hidden="true" />,
    Crew: <UserStar aria-hidden="true" />,
    AC: <Shield aria-hidden="true" />,
    HP: <HeartPlus aria-hidden="true" />,
    'Damage Threshold': <ShieldLock aria-hidden="true" />,
    'Personal Travel Cost': <HandCoins aria-hidden="true" />,
    'Shipping Cost': <Package2 aria-hidden="true" />,
}

const mountIcons: Record<string, ReactNode> = {
    Speed: <CircleGauge aria-hidden="true" />,
    'Carrying Capacity': <Package aria-hidden="true" />,
    'Monster Stat Block': <Panda aria-hidden="true" />,
}

const spellcastingFocusIcons: Record<string, ReactNode> = {
    'Spellcasting Focus Requirement': <MessageCircleCheck aria-hidden="true" />,
}

interface ItemModalProps {
    item: Item
    configurationSummary?: string
    selectedVariantOption?: VariantBaseOption
    onClose: () => void
}

function hasText(value: string | undefined): value is string {
    return Boolean(value?.trim() && !['—', '-', 'none', 'unknown'].includes(value.trim().toLowerCase()))
}

function Information({ label, value, icon, outlined = false }: { label: string; value: ReactNode; icon: ReactNode; outlined?: boolean }) {
    return <div className={`flex min-w-0 flex-[1_1_150px] items-center gap-[14px] p-[18px] [&>svg]:size-[26px] [&>svg]:shrink-0 [&>svg]:text-silver ${outlined ? 'rounded-lg border border-border bg-panel-strong' : ''}`}>
        {icon}<div><dt className="mb-1.5 font-display text-[11px] text-gold-bright">{label}</dt><dd className="text-sm leading-[1.6]">{value}</dd></div>
    </div>
}

function EquipmentSection({ title, information, kind = 'weapon' }: { title: string; information?: ItemInformation[]; kind?: 'weapon' | 'armor' | 'vehicle' | 'mount' | 'spellcastingFocus' }) {
    const visibleInformation = information?.filter((entry) => hasText(entry.value)) ?? []
    if (!visibleInformation.length) return null
    const icons = kind === 'armor' ? armorIcons : kind === 'vehicle' ? vehicleIcons : kind === 'mount' ? mountIcons : kind === 'spellcastingFocus' ? spellcastingFocusIcons : weaponIcons
    const fallbackIcon = kind === 'armor' ? <Shield aria-hidden="true" /> : kind === 'vehicle' || kind === 'mount' ? <Package aria-hidden="true" /> : kind === 'spellcastingFocus' ? <MessageCircleCheck aria-hidden="true" /> : <Swords aria-hidden="true" />
    return <section><h3 className={`${sectionHeadingClass} flex items-center gap-[14px] after:h-px after:flex-1 after:bg-border after:content-['']`}>{title}</h3><dl className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[601px]:grid-cols-1">
        {visibleInformation.map((entry) => <Information key={entry.label} label={entry.label} value={kind === 'weapon' ? entry.value.charAt(0).toLocaleUpperCase('en-US') + entry.value.slice(1) : entry.value} outlined icon={icons[entry.label] ?? fallbackIcon} />)}
    </dl></section>
}

function DescriptionParagraph({ text }: { text: string }) {
    const label = text.match(/^([^:\n.!?]{1,80}:)(?=\s|$)/)?.[1]
    return <p className="mb-[18px] whitespace-pre-line text-sm leading-[1.85] text-cream">{label ? <><strong className="font-semibold">{label}</strong>{text.slice(label.length)}</> : text}</p>
}

function DescriptionTable({ block }: { block: Extract<ItemDescriptionBlock, { type: 'table' }> }) {
    return <div className="mb-[18px] overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm leading-[1.6]">
            {block.caption && <caption className="bg-panel-strong px-4 py-3 text-left font-display text-gold-bright">{block.caption}</caption>}
            {block.columns.length > 0 && <thead className="bg-panel-strong text-gold-bright"><tr>
                {block.columns.map((column, index) => <th key={index} scope="col" className="min-w-[30px] border-b border-border px-4 py-2.5 font-semibold">{column}</th>)}
            </tr></thead>}
            <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-border even:bg-surface last:border-b-0">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="min-w-[30px] px-4 py-2.5 text-cream">{cell}</td>)}
            </tr>)}</tbody>
        </table>
    </div>
}

export function ItemModal({ item, configurationSummary, selectedVariantOption, onClose }: ItemModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const thumbnailRef = useRef<HTMLButtonElement>(null)
    const [images, setImages] = useState<ItemImage[]>([])
    const [imageFailed, setImageFailed] = useState(false)
    const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
    const hasItemImage = images.length > 0 && !imageFailed
    const displayedPrice = item.basePriceGp ?? item.variantPriceGp
    const hasPrice = displayedPrice != null && Number.isFinite(displayedPrice) && displayedPrice >= 0
    const characteristics = [...new Set((item.characteristics ?? [item.description, ...item.properties]).map((text) => text.trim()).filter(hasText))]
    const tradeGoodSubtype = item.category === 'Trade Good' && hasText(item.subtype) ? item.subtype : null
    const descriptionBlocks = [
        ...(tradeGoodSubtype ? [{ type: 'paragraph' as const, text: tradeGoodSubtype }] : []),
        ...(item.descriptionBlocks ?? characteristics.map((text): ItemDescriptionBlock => ({ type: 'paragraph', text }))),
    ]
    const hasWeight = hasText(item.weight)
    const sourceName = getSourceName(item.source)
    const sourcePage = item.sourcePage != null && Number.isFinite(item.sourcePage) && item.sourcePage >= 0 ? item.sourcePage : null
    const badges = <>
        {!['None', 'Unknown'].includes(item.rarity) && <RarityBadge rarity={item.rarity} />}
        <span className="type-pill bg-[color-mix(in_srgb,#4d2f5e_25%,#101119)]! px-3! py-[3px]! text-xs! [&>span]:text-xs!"><TypeMark type={item.type} /></span>
    </>

    useEffect(() => {
        let active = true
        setImages([])
        setImageFailed(false)
        setActiveImageIndex(null)
        getItemImages(item.name, item.source, item.imageFallback)
            .then((result) => { if (active) setImages(result) })
            .catch(() => { if (active) setImages([]) })
        return () => { active = false }
    }, [item.name, item.source, item.imageFallback])

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null
        dialogRef.current?.focus()
        return () => previous?.focus()
    }, [])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (activeImageIndex !== null) return
            const dialog = dialogRef.current
            if (event.key === 'Escape') onClose()
            if (event.key === 'Tab' && dialog) {
                const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'))
                if (!focusable.length) return
                const first = focusable[0]
                const last = focusable[focusable.length - 1]
                if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus() }
                if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [activeImageIndex, onClose])

    return (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
            <div ref={dialogRef} role="dialog" aria-modal={activeImageIndex === null} aria-hidden={activeImageIndex !== null} inert={activeImageIndex !== null} aria-labelledby="item-modal-title" tabIndex={-1} className="flex w-[min(1400px,100%)] max-h-[calc(100dvh-32px)] animate-[modal-in_160ms_ease-out] flex-col overflow-hidden rounded-2xl border border-gold bg-panel shadow-[0_30px_90px_rgb(0_0_0_/_65%),0_0_30px_rgb(178_127_24_/_10%)] outline-none max-[601px]:max-h-dvh max-[601px]:rounded-none max-[601px]:border-0">
                <header className="flex shrink-0 items-center gap-5 border-b border-[#80662c] bg-[linear-gradient(110deg,var(--color-catalog),var(--color-panel))] px-7 py-[22px] max-[900px]:gap-3 max-[900px]:p-4">
                    <span className="item-icon-tile small" aria-hidden="true">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                        <h2 id="item-modal-title" className="font-display text-[clamp(11px,1.5vw,19px)] leading-[1.25] [overflow-wrap:anywhere]">{item.name}</h2>
                        {!tradeGoodSubtype && hasText(item.subtype) && <p className="mt-1 text-xs text-silver [overflow-wrap:anywhere]">{item.subtype}</p>}
                    </div>
                    <button className="icon-button shrink-0" onClick={onClose} aria-label="Close item sheet"><X size={24} /></button>
                </header>
                <div className="arcane-scrollbar grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] overflow-y-auto max-[900px]:grid-cols-[minmax(0,1fr)]">
                    <aside className={`flex min-w-0 flex-col gap-[22px] border-r border-[#80662c] bg-catalog px-7 pb-7 max-[900px]:border-r-0 max-[900px]:border-b max-[601px]:px-5 ${hasItemImage ? '' : 'pt-7 max-[601px]:pt-5'}`} aria-label="Item summary">
                        {hasItemImage && <figure className="relative -mx-7 max-[601px]:-mx-5">
                            <button ref={thumbnailRef} type="button" className="block w-full cursor-zoom-in bg-app" aria-label={`View images of ${item.name}`} onClick={() => setActiveImageIndex(0)}>
                                <img className="block h-[340px] w-full object-contain p-4 max-[900px]:h-[190px] max-[601px]:p-3" src={images[0].src} width={images[0].width} height={images[0].height} alt={item.name} onError={() => setImageFailed(true)} />
                            </button>
                            <div className="absolute inset-x-3 bottom-2.5 flex flex-wrap items-center gap-2.5 [&_.rarity-badge]:bg-[color-mix(in_srgb,currentColor_16%,#101119)]! [&_.rarity-badge]:px-3! [&_.rarity-badge]:py-[3px]! [&_.rarity-badge]:text-xs!">
                                {badges}
                            </div>
                            <figcaption className="pointer-events-none absolute top-2.5 right-3 rounded bg-[rgb(9_11_21_/_85%)] px-[7px] py-[3px] text-[10px] text-silver">{images.length} {images.length === 1 ? 'image' : 'images'}</figcaption>
                        </figure>}
                        {!hasItemImage && <div className="flex flex-wrap items-center gap-2.5 [&_.rarity-badge]:px-3! [&_.rarity-badge]:py-[3px]! [&_.rarity-badge]:text-xs!">{badges}</div>}
                        {item.categories.length > 0 && <section className={`${summarySectionClass} border-t-0 [&_.category-chip]:text-xs! ${hasItemImage ? '-mt-[22px]' : 'pt-0'}`}>
                            <h3 className={sectionHeadingClass}>Categories</h3>
                            <ItemCategories categories={item.categories} presentation="pills" />
                        </section>}
                        {hasPrice &&
                            <section className={summarySectionClass}>
                                <h3 className={sectionHeadingClass}>Base price</h3>
                                <div className="flex items-center gap-3 whitespace-nowrap text-lg text-gold-bright">
                                    <Coins className="shrink-0 text-gold" aria-hidden="true" /><CurrencyDisplay valueGp={displayedPrice} className="flex-nowrap!" />
                                    {item.hasExplicitPrice === false && <span className={`${noteClass} mt-0! shrink-0`}>Estimated</span>}
                                </div>
                            </section>}
                        {hasText(item.source) && <section className={summarySectionClass}>
                            <h3 className={sectionHeadingClass}>Source</h3><div className="flex items-center gap-3 whitespace-nowrap [&_.source-chip]:text-xs!">
                                <BookOpen className="shrink-0 text-gold" aria-hidden="true" />
                                {(sourceName || sourcePage != null) && <span className="flex min-w-0 items-center gap-1 text-[13px] leading-[1.6] italic">
                                    {sourceName && <span className="min-w-0 overflow-hidden text-ellipsis" title={sourceName}>{sourceName}</span>}
                                    {sourceName && sourcePage != null && <span aria-hidden="true">-</span>}
                                    {sourcePage != null && <span className="shrink-0">p. {sourcePage}</span>}
                                </span>}
                                <SourceChip source={item.source} />
                            </div>
                        </section>}
                    </aside>
                    <div className="flex min-w-0 flex-col gap-[26px] p-[26px] [overflow-wrap:anywhere] max-[900px]:p-5">
                        {(hasWeight || item.attunement) && <dl className="flex flex-wrap rounded-lg border border-border bg-surface">
                            {hasWeight && <Information label="Weight" value={item.weight} icon={<Weight aria-hidden="true" />} />}
                            {item.attunement && <Information label="Attunement" value="Required" icon={<Sparkles aria-hidden="true" />} />}
                            {item.attunement && hasText(item.attunementRequirement) && <Information label="Requirement" value={item.attunementRequirement} icon={<CircleDashedCheck aria-hidden="true" />} />}
                        </dl>}
                        <EquipmentSection title="Weapon information" information={item.weaponInformation} />
                        <EquipmentSection title="Armor information" information={item.armorInformation} kind="armor" />
                        <EquipmentSection title="Vehicle Information" information={item.vehicleInformation} kind="vehicle" />
                        <EquipmentSection title="Mount Information" information={item.mountInformation} kind="mount" />
                        <EquipmentSection title="Spellcasting Focus Information" information={item.spellcastingFocusInformation} kind="spellcastingFocus" />
                        {descriptionBlocks.length > 0 && <section><h3 className={`${sectionHeadingClass} flex items-center gap-[14px] after:h-px after:flex-1 after:bg-border after:content-['']`}>Description</h3>
                            {descriptionBlocks.map((block, index) => block.type === 'table'
                                ? <DescriptionTable key={index} block={block} />
                                : <DescriptionParagraph key={index} text={block.text} />)}
                        </section>}
                        {configurationSummary && <p className={noteClass}>Configuration: {configurationSummary}</p>}
                        {!configurationSummary && selectedVariantOption && <p className={noteClass}>Configured with {selectedVariantOption.baseName} from {selectedVariantOption.baseSource}.</p>}
                    </div>
                </div>
            </div>
            {activeImageIndex !== null && hasItemImage && <ItemImageViewer itemName={item.name} images={images} activeIndex={activeImageIndex} returnFocusRef={thumbnailRef} onIndexChange={setActiveImageIndex} onClose={() => setActiveImageIndex(null)} />}
        </div>
    )
}
