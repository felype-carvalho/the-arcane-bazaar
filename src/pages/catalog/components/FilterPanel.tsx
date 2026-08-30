import { useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { CATEGORIES, CATEGORY_ICONS } from '../../../lib/items/categories'
import type { Availability, Category, ItemFilters, ItemType, Rarity } from '../../../types'

const TYPES: ItemType[] = ['Magic', 'Common']
const RARITIES: Rarity[] = ['None', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies', 'Unknown']
const AVAILABILITIES: Availability[] = ['Available', 'Limited', 'Unavailable']

export type FilterGroup = Exclude<keyof ItemFilters, 'search'>

interface FilterPanelProps {
  filters: ItemFilters
  onSearch: (value: string) => void
  onToggle: (group: FilterGroup, value: string) => void
  onClear: () => void
  onClose?: () => void
}

export function FilterPanel({ filters, onSearch, onToggle, onClear, onClose }: FilterPanelProps) {
  const isDirty = filters.search !== '' || filters.types.length > 0 || filters.rarities.length > 0 || filters.categories.length > 0 || filters.availabilities.length > 0

  return (
    <aside className="flex h-full min-h-0 flex-col bg-panel" aria-label="Item filters">
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <h2 className="font-display text-sm uppercase tracking-[0.14em] text-gold">Filters</h2>
        {onClose && <button className="icon-button" onClick={onClose} aria-label="Close filters"><X size={18} /></button>}
      </div>

      <div className="arcane-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-violet-300" size={15} />
          <span className="sr-only">Search items</span>
          <input
            value={filters.search}
            onChange={(event) => onSearch(event.target.value)}
            className="field search-field h-10 w-full text-xs"
            placeholder="Search items..."
          />
        </label>

        <FilterGroupSection title="Item type" group="types" options={TYPES} selected={filters.types} onToggle={onToggle} />
        <FilterGroupSection title="Rarity" group="rarities" options={RARITIES} selected={filters.rarities} onToggle={onToggle} colorize />
        <FilterGroupSection title="Category" group="categories" options={CATEGORIES} selected={filters.categories} onToggle={onToggle} showIcons />
        <FilterGroupSection title="Availability" group="availabilities" options={AVAILABILITIES} selected={filters.availabilities} onToggle={onToggle} />
      </div>

      <div className="border-t border-border p-4">
        <button className="secondary-button w-full" disabled={!isDirty} onClick={onClear}>
          <X size={14} /> Clear all filters
        </button>
      </div>
    </aside>
  )
}

function FilterGroupSection({ title, group, options, selected, onToggle, colorize = false, showIcons = false }: {
  title: string
  group: FilterGroup
  options: readonly string[]
  selected: readonly string[]
  onToggle: (group: FilterGroup, value: string) => void
  colorize?: boolean
  showIcons?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const optionsId = `filter-${group}-options`

  return (
    <fieldset className="mt-5 border-b border-border/70 pb-4 last:border-b-0">
      <legend className="w-full">
        <button
          type="button"
          className="flex w-full items-center justify-between font-display text-sm uppercase tracking-[0.14em] text-gold"
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
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(group, option)}
              className="arcane-checkbox"
            />
            {showIcons && <span aria-hidden="true">{CATEGORY_ICONS[option as Category]}</span>}
            <span className={colorize ? `filter-${option.toLowerCase().replaceAll(' ', '-')}` : ''}>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
