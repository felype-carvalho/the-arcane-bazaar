import { useEffect, useRef, type ReactNode } from 'react'
import { BookOpen, Coins, Shield, Sparkles, Swords, Weight, UserRound, X } from 'lucide-react'
import type { Item, VariantBaseOption } from '../../types'
import type { ItemInformation } from '../../types/catalog'
import { getSourceName } from '../../model/sources'
import { CurrencyDisplay } from '../pricing/CurrencyDisplay'
import { RarityBadge, TypeMark } from './ItemBadges'
import { ItemCategories } from './ItemCategories'
import { SourceChip } from './SourceChip'
import placeholderImage from '../../assets/item-placeholder.png'
import '@fontsource/inter/latin-400-italic.css'

const sectionHeadingClass = 'mb-[14px] font-display text-sm font-semibold tracking-[0.06em] text-gold-bright'
const summarySectionClass = 'border-t border-border pt-5'
const noteClass = 'mt-3 text-[11px] leading-[1.6] text-silver'

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

function EquipmentSection({ title, information, armor = false }: { title: string; information?: ItemInformation[]; armor?: boolean }) {
    const visibleInformation = information?.filter((entry) => hasText(entry.value)) ?? []
    if (!visibleInformation.length) return null
    return <section><h3 className={`${sectionHeadingClass} flex items-center gap-[14px] after:h-px after:flex-1 after:bg-border after:content-['']`}>{title}</h3><dl className="grid grid-cols-2 gap-3 max-[601px]:grid-cols-1">
        {visibleInformation.map((entry) => <Information key={entry.label} {...entry} outlined icon={armor ? <Shield aria-hidden="true" /> : <Swords aria-hidden="true" />} />)}
    </dl></section>
}

function DescriptionParagraph({ text }: { text: string }) {
    const label = text.match(/^([^:\n.!?]{1,80}:)(?=\s|$)/)?.[1]
    return <p className="mb-[18px] whitespace-pre-line text-sm leading-[1.85] text-cream">{label ? <><strong className="font-semibold">{label}</strong>{text.slice(label.length)}</> : text}</p>
}

export function ItemModal({ item, configurationSummary, selectedVariantOption, onClose }: ItemModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const displayedPrice = item.basePriceGp ?? item.variantPriceGp
    const hasPrice = displayedPrice != null && Number.isFinite(displayedPrice) && displayedPrice >= 0
    const characteristics = [...new Set((item.characteristics ?? [item.description, ...item.properties]).map((text) => text.trim()).filter(hasText))]
    const hasWeight = hasText(item.weight)
    const sourceName = getSourceName(item.source)
    const sourcePage = item.sourcePage != null && Number.isFinite(item.sourcePage) && item.sourcePage >= 0 ? item.sourcePage : null
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null
        const dialog = dialogRef.current
        dialog?.focus()
        const onKeyDown = (event: KeyboardEvent) => {
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
        return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
    }, [onClose])

    return (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="item-modal-title" tabIndex={-1} className="flex w-[min(1400px,100%)] max-h-[calc(100dvh-32px)] animate-[modal-in_160ms_ease-out] flex-col overflow-hidden rounded-2xl border border-gold bg-panel shadow-[0_30px_90px_rgb(0_0_0_/_65%),0_0_30px_rgb(178_127_24_/_10%)] outline-none max-[601px]:max-h-dvh max-[601px]:rounded-none max-[601px]:border-0">
                <header className="flex shrink-0 items-center gap-5 border-b border-[#80662c] bg-[linear-gradient(110deg,var(--color-catalog),var(--color-panel))] px-7 py-[22px] max-[900px]:gap-3 max-[900px]:p-4">
                    <span className="item-icon-tile small" aria-hidden="true">{item.icon}</span>
                    <h2 id="item-modal-title" className="min-w-0 flex-1 font-display text-[clamp(11px,1.5vw,19px)] leading-[1.25] [overflow-wrap:anywhere]">{item.name}</h2>
                    <button className="icon-button shrink-0" onClick={onClose} aria-label="Close item sheet"><X size={24} /></button>
                </header>
                <div className="arcane-scrollbar grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] overflow-y-auto max-[900px]:grid-cols-[minmax(0,1fr)]">
                    <aside className="flex min-w-0 flex-col gap-[22px] border-r border-[#80662c] bg-catalog px-7 pb-7 max-[900px]:border-r-0 max-[900px]:border-b max-[601px]:px-5" aria-label="Item summary">
                        <figure className="relative -mx-7 max-[601px]:-mx-5">
                            <img className="block max-h-[340px] w-full object-cover max-[900px]:h-[190px] max-[900px]:bg-app max-[900px]:object-contain" src={placeholderImage} alt="" />
                            <div className="absolute inset-x-3 bottom-2.5 flex flex-wrap items-center gap-2.5 [&_.rarity-badge]:bg-[color-mix(in_srgb,currentColor_16%,#101119)]! [&_.rarity-badge]:px-3! [&_.rarity-badge]:py-[3px]! [&_.rarity-badge]:text-xs!">
                                {!['None', 'Unknown'].includes(item.rarity) && <RarityBadge rarity={item.rarity} />}
                                <span className="type-pill bg-[color-mix(in_srgb,#4d2f5e_25%,#101119)]! px-3! py-[3px]! text-xs! [&>span]:text-xs!"><TypeMark type={item.type} /></span>
                            </div>
                            <figcaption className="absolute top-2.5 right-3 rounded bg-[rgb(9_11_21_/_85%)] px-[7px] py-[3px] text-[10px] text-silver">Illustrative image</figcaption>
                        </figure>
                        {item.categories.length > 0 && <section className={`${summarySectionClass} -mt-[22px] border-t-0 [&_.category-chip]:text-xs!`}>
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
                            {item.attunement && hasText(item.attunementRequirement) && <Information label="Requirement" value={item.attunementRequirement} icon={<UserRound aria-hidden="true" />} />}
                        </dl>}
                        <EquipmentSection title="Weapon information" information={item.weaponInformation} />
                        <EquipmentSection title="Armor information" information={item.armorInformation} armor />
                        {characteristics.length > 0 && <section><h3 className={`${sectionHeadingClass} flex items-center gap-[14px] after:h-px after:flex-1 after:bg-border after:content-['']`}>Description</h3>
                            {characteristics.map((text) => <DescriptionParagraph key={text} text={text} />)}
                        </section>}
                        {configurationSummary && <p className={noteClass}>Configuration: {configurationSummary}</p>}
                        {!configurationSummary && selectedVariantOption && <p className={noteClass}>Configured with {selectedVariantOption.baseName} from {selectedVariantOption.baseSource}.</p>}
                    </div>
                </div>
            </div>
        </div>
    )
}
