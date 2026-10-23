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
import './ItemModal.css'

interface ItemModalProps {
    item: Item
    configurationSummary?: string
    selectedVariantOption?: VariantBaseOption
    onClose: () => void
}

function hasText(value: string | undefined): value is string {
    return Boolean(value?.trim() && !['—', '-', 'none', 'unknown'].includes(value.trim().toLowerCase()))
}

function Information({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return <div className="item-sheet-information">{icon}<div><dt>{label}</dt><dd>{value}</dd></div></div>
}

function EquipmentSection({ title, information, armor = false }: { title: string; information?: ItemInformation[]; armor?: boolean }) {
    const visibleInformation = information?.filter((entry) => hasText(entry.value)) ?? []
    if (!visibleInformation.length) return null
    return <section className="item-sheet-section"><h3>{title}</h3><dl className="item-sheet-equipment">
        {visibleInformation.map((entry) => <Information key={entry.label} {...entry} icon={armor ? <Shield aria-hidden="true" /> : <Swords aria-hidden="true" />} />)}
    </dl></section>
}

function DescriptionParagraph({ text }: { text: string }) {
    const label = text.match(/^([^:\n.!?]{1,80}:)(?=\s|$)/)?.[1]
    return <p>{label ? <><strong>{label}</strong>{text.slice(label.length)}</> : text}</p>
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
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="item-modal-title" tabIndex={-1} className="modal-card item-sheet">
                <header className="item-sheet-header">
                    <span className="item-icon-tile small" aria-hidden="true">{item.icon}</span>
                    <h2 id="item-modal-title">{item.name}</h2>
                    <button className="icon-button" onClick={onClose} aria-label="Close item sheet"><X size={24} /></button>
                </header>
                <div className="item-sheet-body arcane-scrollbar">
                    <aside className="item-sheet-summary" aria-label="Item summary">
                        <figure className="item-sheet-art">
                            <img src={placeholderImage} alt="" />
                            <div className="item-sheet-badges">
                                {!['None', 'Unknown'].includes(item.rarity) && <RarityBadge rarity={item.rarity} />}
                                <span className="type-pill"><TypeMark type={item.type} /></span>
                            </div>
                            <figcaption>Illustrative image</figcaption>
                        </figure>
                        {item.categories.length > 0 && <section className="item-sheet-summary-section item-sheet-categories">
                            <h3>Categories</h3>
                            <ItemCategories categories={item.categories} presentation="pills" />
                        </section>}
                        {hasPrice &&
                            <section className="item-sheet-summary-section">
                                <h3>Base price</h3>
                                <div className="item-sheet-price">
                                    <Coins aria-hidden="true" /><CurrencyDisplay valueGp={displayedPrice} />
                                    {item.hasExplicitPrice === false && <span className="item-sheet-note">Estimated</span>}
                                </div>
                            </section>}
                        {hasText(item.source) && <section className="item-sheet-summary-section">
                            <h3>Source</h3><div className="item-sheet-source"><BookOpen aria-hidden="true" />
                                {(sourceName || sourcePage != null) && <span className="item-sheet-source-reference">
                                    {sourceName && <span className="item-sheet-source-name" title={sourceName}>{sourceName}</span>}
                                    {sourceName && sourcePage != null && <span aria-hidden="true">-</span>}
                                    {sourcePage != null && <span className="item-sheet-source-page">p. {sourcePage}</span>}
                                </span>}
                                <SourceChip source={item.source} />
                            </div>
                        </section>}
                    </aside>
                    <div className="item-sheet-content">
                        {(hasWeight || item.attunement) && <dl className="item-sheet-general">
                            {hasWeight && <Information label="Weight" value={item.weight} icon={<Weight aria-hidden="true" />} />}
                            {item.attunement && <Information label="Attunement" value="Required" icon={<Sparkles aria-hidden="true" />} />}
                            {item.attunement && hasText(item.attunementRequirement) && <Information label="Requirement" value={item.attunementRequirement} icon={<UserRound aria-hidden="true" />} />}
                        </dl>}
                        <EquipmentSection title="Weapon information" information={item.weaponInformation} />
                        <EquipmentSection title="Armor information" information={item.armorInformation} armor />
                        {characteristics.length > 0 && <section className="item-sheet-section item-sheet-characteristics"><h3>Description</h3>
                            {characteristics.map((text) => <DescriptionParagraph key={text} text={text} />)}
                        </section>}
                        {configurationSummary && <p className="item-sheet-note">Configuration: {configurationSummary}</p>}
                        {!configurationSummary && selectedVariantOption && <p className="item-sheet-note">Configured with {selectedVariantOption.baseName} from {selectedVariantOption.baseSource}.</p>}
                    </div>
                </div>
            </div>
        </div>
    )
}
