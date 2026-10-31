import { useInterfaceTranslation } from '@/app/i18n'
import { useEffect, useId, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { CATEGORY_ICONS } from '../../model/items/categories'
import type { /* Availability, */ Category, ItemFilters, ItemType, Rarity } from '../../types'
import { TypeMark } from '../item/ItemBadges'
import { formatSourceLabel, SourceChip } from '../item/SourceChip'
import { normalizeSource } from '../../model/sources'

const TYPES: ItemType[] = ['Common', 'Magic']
// const AVAILABILITIES: Availability[] = ['Available', 'Limited', 'Unavailable']

export type FilterGroup = Exclude<keyof ItemFilters, 'search'>

interface FilterPanelProps {
    filters: ItemFilters
    availableRarities: readonly Rarity[]
    availableCategories: readonly Category[]
    availableSources: readonly string[]
    onSearch: (value: string) => void
    onTypeSelect: (value: ItemType) => void
    onToggle: (group: FilterGroup, value: string) => void
    onCategorySelect: (value: Category | 'All') => void
    onSourceSelect: (value: string) => void
    onClear: () => void
    onClose?: () => void
}

export function FilterPanel({ filters, availableRarities, availableCategories, availableSources, onSearch, onTypeSelect, onToggle, onCategorySelect, onSourceSelect, onClear, onClose }: FilterPanelProps) {
    const { t } = useInterfaceTranslation()
    return (
        <aside className="flex h-full min-h-0 flex-col bg-panel" aria-label={t("filters.region")}>
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
                <h2 className="font-display text-sm uppercase tracking-[0.14em] text-gold">{t("catalog.filters")}</h2>
                {onClose && <button className="icon-button" onClick={onClose} aria-label={t("filters.close")}><X size={18} /></button>}
            </div>

            <div className="arcane-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-300" size={15} />
                    <span className="sr-only">{t("filters.searchLabel")}</span>
                    <input
                        value={filters.search}
                        onChange={(event) => onSearch(event.target.value)}
                        className="field search-field h-10 w-full text-xs"
                        placeholder={t("filters.searchPlaceholder")}
                    />
                </label>

                <FilterGroupSection title={t("filters.type")} group="types" options={TYPES} selected={filters.types} onToggle={onToggle} onSingleSelect={(value) => onTypeSelect(value as ItemType)} selectionMode="single" showTypeMarks defaultOpen />
                {filters.types[0] === 'Magic' && <FilterGroupSection title={t("filters.rarity")} group="rarities" options={availableRarities} selected={filters.rarities} onToggle={onToggle} colorize />}
                <CategoryFilterSection options={availableCategories} selected={filters.categories} onSelect={onCategorySelect} itemType={filters.types[0] ?? 'Common'} />
                <SourceFilterSection options={availableSources} selected={filters.sources} onSelect={onSourceSelect} />
                {/* <FilterGroupSection title="Availability" group="availabilities" options={AVAILABILITIES} selected={filters.availabilities} onToggle={onToggle} /> */}
            </div>

            <div className="border-t border-border p-4">
                <button className="primary-button w-full" onClick={onClear}>
                    <X size={14} /> {t("filters.clearAll")}</button>
            </div>
        </aside>
    )
}

function SourceFilterSection({ options, selected, onSelect }: {
    options: readonly string[]
    selected: readonly string[]
    onSelect: (value: string) => void
}) {
    const { t } = useInterfaceTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const instanceId = useId()
    const optionsId = `filter-sources-${instanceId}-options`
    const selectedSources = new Set(selected.map(normalizeSource))
    const sortedSources = [...options].sort((left, right) =>
        formatSourceLabel(left).localeCompare(formatSourceLabel(right), 'en-US', { sensitivity: 'base' })
        || left.localeCompare(right, 'en-US'))

    return (
        <fieldset className="mt-5 border-b border-border/70 pb-4 last:border-b-0">
            <legend className="w-full">
                <button
                    type="button"
                    className="flex w-full items-center justify-between font-display text-[12px] uppercase tracking-[0.14em] text-gold"
                    aria-expanded={isOpen}
                    aria-controls={optionsId}
                    onClick={() => setIsOpen((current) => !current)}
                >
                    {t("filters.source")}<ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </legend>
            <div id={optionsId} className="mt-3 flex flex-wrap items-center gap-2" hidden={!isOpen}>
                <button type="button" className="category-chip" aria-pressed={selected.length === 0} onClick={() => onSelect('All')}>
                    {t("common.all")}</button>
                {sortedSources.map((source) => (
                    <SourceChip key={source} source={source} selected={selectedSources.has(normalizeSource(source))} onSelectedChange={() => onSelect(source)} />
                ))}
            </div>
        </fieldset>
    )
}

function FilterGroupSection({ title, group, options, selected, onToggle, onSingleSelect, selectionMode = 'multiple', colorize = false, showTypeMarks = false, defaultOpen = false }: {
    title: string
    group: FilterGroup
    options: readonly string[]
    selected: readonly string[]
    onToggle: (group: FilterGroup, value: string) => void
    onSingleSelect?: (value: string) => void
    selectionMode?: 'single' | 'multiple'
    colorize?: boolean
    showTypeMarks?: boolean
    defaultOpen?: boolean
}) {
    const { label } = useInterfaceTranslation()
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const instanceId = useId()
    const optionsId = `filter-${group}-${instanceId}-options`

    return (
        <fieldset className="mt-5 border-b border-border/70 pb-4 last:border-b-0">
            <legend className="w-full">
                <button
                    type="button"
                    className="flex w-full items-center justify-between font-display text-[12px] uppercase tracking-[0.14em] text-gold"
                    aria-expanded={isOpen}
                    aria-controls={optionsId}
                    onClick={() => setIsOpen((current) => !current)}
                >
                    {title}<ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </legend>
            <div id={optionsId} className="mt-3 space-y-2.5" hidden={!isOpen}>
                {options.map((option) => (
                    <label key={option} className="group flex cursor-pointer items-center gap-2.5 text-xs text-cream transition-colors hover:text-gold-bright">
                        <input
                            type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                            name={selectionMode === 'single' ? `filter-${group}-${instanceId}` : undefined}
                            checked={selected.includes(option)}
                            onChange={() => selectionMode === 'single' ? onSingleSelect?.(option) : onToggle(group, option)}
                            className={selectionMode === 'single' ? 'accent-gold' : 'arcane-checkbox'}
                        />
                        {showTypeMarks
                            ? <TypeMark type={option as ItemType} />
                            : <span className={colorize ? `filter-${option.toLowerCase().replaceAll(' ', '-')}` : ''}>{label(option)}</span>}
                    </label>
                ))}
            </div>
        </fieldset>
    )
}

function CategoryFilterSection({ options, selected, onSelect, itemType }: {
    options: readonly Category[]
    selected: readonly Category[]
    onSelect: (value: Category | 'All') => void
    itemType: ItemType
}) {
    const { t, label } = useInterfaceTranslation()
    const [isOpen, setIsOpen] = useState(true)
    const instanceId = useId()
    const optionsId = `filter-categories-${instanceId}-options`

    useEffect(() => {
        if (itemType === 'Magic') setIsOpen(true)
    }, [itemType])

    return (
        <fieldset className="mt-5 border-b border-border/70 pb-4 last:border-b-0">
            <legend className="w-full">
                <button
                    type="button"
                    className="flex w-full items-center justify-between font-display text-[12px] uppercase tracking-[0.14em] text-gold"
                    aria-expanded={isOpen}
                    aria-controls={optionsId}
                    onClick={() => setIsOpen((current) => !current)}
                >
                    {t("filters.category")}<ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </legend>
            <div id={optionsId} className="mt-3 flex flex-wrap gap-2" hidden={!isOpen}>
                <button type="button" className="category-chip" aria-pressed={selected.length === 0} onClick={() => onSelect('All')}>
                    {t("common.all")}</button>
                {options.map((category) => (
                    <button key={category} type="button" className="category-chip" aria-pressed={selected.includes(category)} onClick={() => onSelect(category)}>
                        <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
                        <span>{label(category)}</span>
                    </button>
                ))}
            </div>
        </fieldset>
    )
}
