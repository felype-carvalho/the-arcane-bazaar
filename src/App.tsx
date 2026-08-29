import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Coins,
  Filter,
  Gem,
  Menu,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { filterAndSortItems, EMPTY_FILTERS } from './lib/catalog'
import { calculatePricing, DEFAULT_MODIFIERS, formatGp, signedLabel } from './lib/pricing'
import { getItems } from './services/catalog'
import type {
  Availability,
  Category,
  Economy,
  Item,
  ItemFilters,
  ItemType,
  MagicFrequency,
  Market,
  Negotiation,
  PricingModifiers,
  Rarity,
  Reputation,
  SortDirection,
  SortKey,
} from './types'

const PAGE_SIZE = 10
const TYPES: ItemType[] = ['Magic', 'Common']
const RARITIES: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact']
const CATEGORIES: Category[] = [
  'Adventuring Gear',
  'Ammunition',
  'Amulet',
  'Apparel',
  'Armor',
  'Bag/Container',
  'Clockwork',
  'Consumable',
  'Explosive',
  'Food and Drink',
  'Gem',
  'Instrument',
  'Mount',
  'Other',
  'Poison',
  'Potion',
  'Ring',
  'Scroll',
  'Service',
  'Spellcasting Focus',
  'Staff / Rod',
  'Summonable',
  'Tattoo',
  'Tome',
  'Tool',
  'Trade Good',
  'Vehicle',
  'Weapon',
]
const AVAILABILITIES: Availability[] = ['Available', 'Limited', 'Unavailable']

const rarityClass: Record<Rarity, string> = {
  Common: 'rarity-common',
  Uncommon: 'rarity-uncommon',
  Rare: 'rarity-rare',
  'Very Rare': 'rarity-very-rare',
  Legendary: 'rarity-legendary',
  Artifact: 'rarity-artifact',
}

const categoryIcon: Record<Category, string> = {
  Consumable: '🧪', Potion: '⚗️', Scroll: '📜', Apparel: '🧥', Ring: '💍', Amulet: '📿', Weapon: '⚔️', Armor: '🛡️',
  'Spellcasting Focus': '🪄', 'Staff / Rod': '🦯', Tattoo: '🖋️', Clockwork: '⚙️', Instrument: '🎵', 'Bag/Container': '🎒', Gem: '💎', Tome: '📕',
  Tool: '🔧', Summonable: '👻', Ammunition: '🏹', 'Adventuring Gear': '🧰', Explosive: '💥', 'Food and Drink': '🍽️', Mount: '🐎', Poison: '☠️',
  Service: '🤝', 'Trade Good': '⚖️', Vehicle: '🛶', Other: '✨',
}

type FilterGroup = Exclude<keyof ItemFilters, 'search'>

function RarityBadge({ rarity }: { rarity: Rarity }) {
  return <span className={`rarity-badge ${rarityClass[rarity]}`}>{rarity}</span>
}

function TypeMark({ type }: { type: ItemType }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] ${type === 'Magic' ? 'text-violet-400' : 'text-slate-400'}`}>
      {type === 'Magic' ? <Sparkles size={13} className="text-gold" /> : <Gem size={13} className="text-stone-400" />}
      {type}
    </span>
  )
}

interface FilterPanelProps {
  filters: ItemFilters
  onSearch: (value: string) => void
  onToggle: (group: FilterGroup, value: string) => void
  onClear: () => void
  onClose?: () => void
}

function FilterPanel({ filters, onSearch, onToggle, onClear, onClose }: FilterPanelProps) {
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
            {showIcons && <span aria-hidden="true">{categoryIcon[option as Category]}</span>}
            <span className={colorize ? `filter-${option.toLowerCase().replaceAll(' ', '-')}` : ''}>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface CatalogProps {
  items: Item[]
  selectedId?: string
  sortKey: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
  onSelect: (item: Item) => void
}

function Catalog({ items, selectedId, sortKey, direction, onSort, onSelect }: CatalogProps) {
  const SortHeader = ({ label, column, className = '' }: { label: string, column: SortKey, className?: string }) => (
    <th className={className} scope="col">
      <button className="table-sort" onClick={() => onSort(column)} aria-label={`Sort by ${label}`}>
        {label}<span aria-hidden="true" className={sortKey === column ? 'text-gold-bright' : 'text-muted'}>{sortKey === column ? (direction === 'asc' ? '▲' : '▼') : '⇅'}</span>
      </button>
    </th>
  )

  if (!items.length) {
    return (
      <div className="flex min-h-[460px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-full border border-gold/20 bg-gold/5 text-gold"><Search size={24} /></div>
        <h3 className="font-display text-lg text-cream">No items found</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">Try another name or remove some filters to search the shelves again.</p>
      </div>
    )
  }

  return (
    <>
      <div className="hidden h-full overflow-auto md:block arcane-scrollbar">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-panel-strong shadow-[0_1px_0_var(--color-border)]">
            <tr>
              <SortHeader label="Name" column="name" className="w-[36%]" />
              <SortHeader label="Item type" column="type" className="w-[28%]" />
              <SortHeader label="Rarity" column="rarity" className="w-[18%]" />
              <SortHeader label="Price" column="price" className="w-[18%]" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(item) } }}
                tabIndex={0}
                aria-selected={selectedId === item.id}
                className={`catalog-row ${selectedId === item.id ? 'selected' : ''}`}
              >
                <td>
                  <span className="font-display text-[12px] font-semibold text-cream">{item.name}</span>
                </td>
                <td>
                  <TypeMark type={item.type} />
                  <p className="mt-1 text-[10px] text-muted">{categoryIcon[item.category]} {item.category}</p>
                </td>
                <td><RarityBadge rarity={item.rarity} /></td>
                <td className="font-display text-xs font-semibold text-gold-bright">{item.basePriceGp == null ? <span className="variable-price">◇ Variable</span> : formatGp(item.basePriceGp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 p-3 md:hidden">
        {items.map((item) => (
          <button key={item.id} onClick={() => onSelect(item)} className={`item-card text-left ${selectedId === item.id ? 'selected' : ''}`}>
            <span className="text-2xl" aria-hidden="true">{item.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-xs font-semibold text-cream">{item.name}</span>
              <span className="mt-1 block text-[10px] text-muted">{item.category} · {item.subtype}</span>
            </span>
            <span className="flex flex-col items-end gap-2">
              <RarityBadge rarity={item.rarity} />
              <span className="font-display text-[10px] font-semibold text-gold-bright">{item.basePriceGp == null ? 'Variable' : formatGp(item.basePriceGp)}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

function PriceCalculator({ item, modifiers, setModifiers, manualPrice, setManualPrice }: {
  item: Item
  modifiers: PricingModifiers
  setModifiers: Dispatch<SetStateAction<PricingModifiers>>
  manualPrice: string
  setManualPrice: (value: string) => void
}) {
  const [customName, setCustomName] = useState('')
  const [customPercent, setCustomPercent] = useState('')
  const manualValue = manualPrice === '' ? null : Number(manualPrice)
  const result = calculatePricing(item, modifiers, manualValue)

  const addModifier = () => {
    const percent = Number(customPercent)
    if (!customName.trim() || !Number.isFinite(percent)) return
    setModifiers((current) => ({ ...current, custom: [...current.custom, { id: crypto.randomUUID(), name: customName.trim(), percent }] }))
    setCustomName('')
    setCustomPercent('')
  }

  return (
    <section className="border-t border-border px-5 py-5" aria-labelledby="calculator-title">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="eyebrow">Market calculator</p>
          <h3 id="calculator-title" className="mt-1 font-display text-sm text-cream">Price this item</h3>
        </div>
        <SlidersHorizontal size={17} className="text-gold" />
      </div>

      {item.basePriceGp == null && (
        <label className="mb-4 block">
          <span className="field-label">Manual base price (GP)</span>
          <input className="field mt-1.5 w-full" type="number" min="1" value={manualPrice} onChange={(event) => setManualPrice(event.target.value)} placeholder="Enter an agreed value" />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Economy" value={modifiers.economy} onChange={(value) => setModifiers((current) => ({ ...current, economy: value as Economy }))} options={[['recession', 'Recession · −20%'], ['stable', 'Stable · 0%'], ['thriving', 'Thriving · +15%']]} />
        <SelectField label="Market" value={modifiers.market} onChange={(value) => setModifiers((current) => ({ ...current, market: value as Market }))} options={[['oversupply', 'Oversupply · −20%'], ['balanced', 'Balanced · 0%'], ['highDemand', 'High demand · +25%']]} />
        <SelectField label="Reputation" value={modifiers.reputation} onChange={(value) => setModifiers((current) => ({ ...current, reputation: value as Reputation }))} options={[['unknown', 'Unknown · 0%'], ['trusted', 'Trusted · ±5%'], ['celebrated', 'Celebrated · ±10%']]} />
        <SelectField label="Negotiation" value={modifiers.negotiation} onChange={(value) => setModifiers((current) => ({ ...current, negotiation: value as Negotiation }))} options={[['poor', 'Poor · ±10%'], ['fair', 'Fair · 0%'], ['skilled', 'Skilled · ±10%']]} />
        {item.type === 'Magic' && <div className="col-span-2"><SelectField label="Magic frequency" value={modifiers.magicFrequency} onChange={(value) => setModifiers((current) => ({ ...current, magicFrequency: value as MagicFrequency }))} options={[['rare', 'Rare · +25%'], ['standard', 'Standard · 0%'], ['abundant', 'Abundant · −15%']]} /></div>}
      </div>

      <div className="mt-5 border-t border-border/70 pt-4">
        <p className="field-label">Custom modifier</p>
        <div className="mt-1.5 grid grid-cols-[1fr_80px_36px] gap-2">
          <input aria-label="Modifier name" className="field min-w-0" value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Festival tax" />
          <input aria-label="Modifier percent" className="field min-w-0" type="number" value={customPercent} onChange={(event) => setCustomPercent(event.target.value)} placeholder="%" onKeyDown={(event) => { if (event.key === 'Enter') addModifier() }} />
          <button className="icon-button border border-gold/30 text-gold" onClick={addModifier} aria-label="Add custom modifier"><Plus size={16} /></button>
        </div>
        {modifiers.custom.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {modifiers.custom.map((modifier) => (
              <li key={modifier.id} className="flex items-center justify-between rounded border border-border bg-surface px-2.5 py-2 text-[11px] text-cream">
                <span>{modifier.name} <span className="text-gold">{signedLabel(modifier.percent)}</span></span>
                <button className="text-muted hover:text-red-400" onClick={() => setModifiers((current) => ({ ...current, custom: current.custom.filter((entry) => entry.id !== modifier.id) }))} aria-label={`Remove ${modifier.name}`}><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[10px] text-muted"><span>Base price</span><strong className="font-display text-cream">{formatGp(result.basePrice)}</strong></div>
          <details className="breakdown group">
            <summary>Adjustment breakdown <ChevronDown size={13} /></summary>
            <div className="space-y-1.5 border-t border-border/70 px-3 py-2">
              {result.adjustments.map((adjustment, index) => (
                <div key={`${adjustment.label}-${index}`} className="grid grid-cols-[1fr_44px_44px] gap-1 text-[9px] text-muted">
                  <span>{adjustment.label}</span><span className="text-right">{signedLabel(adjustment.buyPercent)}</span><span className="text-right">{signedLabel(adjustment.sellPercent)}</span>
                </div>
              ))}
            </div>
          </details>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="price-result buy">
              <span>Buy from merchant</span>
              <strong>{formatGp(result.buyPrice)}</strong>
              <small>{signedLabel(result.buyTotalPercent)} adjustment</small>
            </div>
            <div className="price-result sell">
              <span>Sell to merchant</span>
              <strong>{formatGp(result.sellPrice)}</strong>
              <small>50% base · {signedLabel(result.sellTotalPercent)}</small>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-5 text-amber-100/70">Enter a positive base price to calculate this variable item.</div>
      )}
    </section>
  )
}

function SelectField({ label, value, onChange, options }: { label: string, value: string, onChange: (value: string) => void, options: [string, string][] }) {
  return (
    <label className="block min-w-0">
      <span className="field-label">{label}</span>
      <select className="field mt-1.5 w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  )
}

function ItemDetails({ item, onOpenModal, onClose, modifiers, setModifiers, manualPrice, setManualPrice }: {
  item: Item
  onOpenModal: () => void
  onClose?: () => void
  modifiers: PricingModifiers
  setModifiers: Dispatch<SetStateAction<PricingModifiers>>
  manualPrice: string
  setManualPrice: (value: string) => void
}) {
  return (
    <aside className="arcane-scrollbar h-full overflow-y-auto bg-panel" aria-label={`${item.name} details`}>
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="item-icon-tile" aria-hidden="true">{item.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-base leading-6 text-gold-bright">{item.name}</h2>
              {onClose && <button className="icon-button shrink-0" onClick={onClose} aria-label="Close item details"><X size={18} /></button>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2"><RarityBadge rarity={item.rarity} /><span className="type-pill"><Sparkles size={11} /> {item.type}</span></div>
          </div>
        </div>
        <p className="mt-4 font-display text-[11px] leading-6 text-gold-bright/90">{item.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-border px-5 py-4">
        <DetailFact label="Category" value={`${categoryIcon[item.category]} ${item.category}`} />
        <DetailFact label="Subtype" value={item.subtype} />
        <DetailFact label="Weight" value={item.weight} />
        <DetailFact label="Attunement" value={item.attunement ? 'Required' : 'Not required'} />
      </div>

      <div className="border-b border-border px-5 py-4">
        <p className="eyebrow">Availability & price</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="detail-box"><Coins size={15} className="text-gold" /><span>{item.basePriceGp == null ? 'Variable price' : formatGp(item.basePriceGp)}</span></div>
          <div className="detail-box"><Tag size={14} className="text-violet-300" /><span>{item.availability}</span></div>
        </div>
      </div>

      <div className="border-b border-border px-5 py-4">
        <p className="eyebrow">Tags</p>
        <div className="mt-2 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}</div>
        <button className="primary-button mt-4 w-full" onClick={onOpenModal}><BookOpen size={15} /> View full item sheet</button>
      </div>

      <PriceCalculator item={item} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} />
    </aside>
  )
}

function DetailFact({ label, value }: { label: string, value: string }) {
  return <div><p className="eyebrow">{label}</p><p className="mt-1.5 font-display text-[11px] font-semibold leading-5 text-cream">{value}</p></div>
}

function ItemModal({ item, onClose }: { item: Item, onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
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
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="item-modal-title" tabIndex={-1} className="modal-card">
        <div className="modal-header">
          <div className="flex items-center gap-4">
            <div className="item-icon-tile small" aria-hidden="true">{item.icon}</div>
            <div><p className="eyebrow">Complete item sheet</p><h2 id="item-modal-title" className="mt-1 font-display text-xl text-gold-bright">{item.name}</h2></div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close item sheet"><X size={20} /></button>
        </div>
        <div className="arcane-scrollbar overflow-y-auto p-6 md:p-8">
          <div className="flex flex-wrap gap-2"><RarityBadge rarity={item.rarity} /><span className="type-pill"><Sparkles size={11} /> {item.type}</span><span className="tag-pill">{item.availability}</span></div>
          <p className="mt-6 max-w-2xl font-display text-sm leading-7 text-cream">{item.description}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sheet-fact"><Swords size={17} /><DetailFact label="Category" value={item.category} /></div>
            <div className="sheet-fact"><Shield size={17} /><DetailFact label="Subtype" value={item.subtype} /></div>
            <div className="sheet-fact"><Coins size={17} /><DetailFact label="Base price" value={item.basePriceGp == null ? 'Variable' : formatGp(item.basePriceGp)} /></div>
            <div className="sheet-fact"><Sparkles size={17} /><DetailFact label="Attunement" value={item.attunement ? 'Required' : 'Not required'} /></div>
          </div>
          <section className="mt-8 border-t border-border pt-6">
            <h3 className="font-display text-sm uppercase tracking-[0.12em] text-gold">Properties</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">{item.properties.map((property) => <li key={property} className="flex gap-3 rounded border border-border bg-surface p-3 text-xs leading-5 text-cream"><Sparkles size={14} className="mt-0.5 shrink-0 text-gold" />{property}</li>)}</ul>
          </section>
          <section className="mt-7 border-t border-border pt-6"><h3 className="font-display text-sm uppercase tracking-[0.12em] text-gold">Tags</h3><div className="mt-3 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}</div></section>
        </div>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, totalItems, start, end, onPage }: { page: number, totalPages: number, totalItems: number, start: number, end: number, onPage: (page: number) => void }) {
  return (
    <div className="flex min-h-12 items-center justify-between border-t border-border bg-panel px-4 py-2">
      <p className="text-[10px] text-muted">{totalItems ? `${start}–${end} of ${totalItems} items` : '0 items'}</p>
      <div className="flex items-center gap-1">
        <button className="page-button" disabled={page === 1} onClick={() => onPage(1)} aria-label="First page"><ChevronsLeft size={14} /></button>
        <button className="page-button" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
        <span className="mx-1 font-display text-[11px] text-cream"><strong className="text-gold-bright">{page}</strong> / {Math.max(totalPages, 1)}</span>
        <button className="page-button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
        <button className="page-button" disabled={page >= totalPages} onClick={() => onPage(totalPages)} aria-label="Last page"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filters, setFilters] = useState<ItemFilters>(EMPTY_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [direction, setDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Item | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [modifiers, setModifiers] = useState<PricingModifiers>(DEFAULT_MODIFIERS)
  const [manualPrice, setManualPrice] = useState('')

  useEffect(() => {
    getItems().then((catalog) => { setItems(catalog); setSelected(catalog[0] ?? null) }).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { setPage(1) }, [filters, sortKey, direction])
  useEffect(() => { setManualPrice(''); setModifiers(DEFAULT_MODIFIERS) }, [selected?.id])
  useEffect(() => {
    const shouldLock = modalOpen || filtersOpen || detailsOpen
    document.body.style.overflow = shouldLock ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalOpen, filtersOpen, detailsOpen])

  const filtered = useMemo(() => filterAndSortItems(items, filters, sortKey, direction), [items, filters, sortKey, direction])
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(totalPages, 1))
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const toggleFilter = (group: FilterGroup, value: string) => {
    setFilters((current) => {
      const values = current[group] as string[]
      return { ...current, [group]: values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value] }
    })
  }

  const selectItem = (item: Item) => { setSelected(item); if (window.innerWidth < 1280) setDetailsOpen(true) }
  const sort = (key: SortKey) => { if (key === sortKey) setDirection((current) => current === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setDirection('asc') } }

  return (
    <div className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-app text-cream">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-gold/35 bg-header px-4 md:px-5">
        <div>
          <h1 className="font-display text-sm font-semibold tracking-wide text-gold-bright md:text-base">The Arcane Bazaar</h1>
          <p className="mt-0.5 hidden text-[9px] tracking-wide text-violet-300/70 sm:block">Magic Item Market & Pricing Guide</p>
        </div>
        <div className="flex items-center gap-3 text-muted">
          <span className="hidden items-center gap-2 font-display text-[10px] uppercase tracking-[0.15em] md:flex"><Swords size={17} /> D&D 5.5e</span>
          <span className="h-4 w-px bg-border" />
          <Shield size={16} className="text-violet-300" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[242px] shrink-0 border-r border-border lg:block">
          <FilterPanel filters={filters} onSearch={(search) => setFilters((current) => ({ ...current, search }))} onToggle={toggleFilter} onClear={() => setFilters(EMPTY_FILTERS)} />
        </div>

        <main className="flex min-w-0 flex-1 flex-col bg-catalog">
          <div className="flex min-h-12 items-center justify-between border-b border-border bg-panel px-3 lg:hidden">
            <button className="secondary-button" onClick={() => setFiltersOpen(true)}><Filter size={14} /> Filters</button>
            <span className="text-[10px] text-muted">{filtered.length} items</span>
            <button className="secondary-button" onClick={() => selected && setDetailsOpen(true)} disabled={!selected}><Menu size={14} /> Item</button>
          </div>

          <div className="min-h-0 flex-1">
            {loading ? (
              <div className="flex h-full items-center justify-center"><div className="text-center"><Sparkles className="mx-auto animate-pulse text-gold" /><p className="mt-3 font-display text-xs text-muted">Consulting the bazaar ledger...</p></div></div>
            ) : loadError ? (
              <div className="flex h-full items-center justify-center p-6 text-center"><div><h2 className="font-display text-lg text-cream">The ledger could not be opened</h2><p className="mt-2 text-sm text-muted">Refresh the page to try loading the catalog again.</p></div></div>
            ) : (
              <Catalog items={pageItems} selectedId={selected?.id} sortKey={sortKey} direction={direction} onSort={sort} onSelect={selectItem} />
            )}
          </div>

          <Pagination page={safePage} totalPages={totalPages} totalItems={filtered.length} start={filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} end={Math.min(safePage * PAGE_SIZE, filtered.length)} onPage={setPage} />
        </main>

        <div className="hidden w-[360px] shrink-0 border-l border-border xl:block">
          {selected ? <ItemDetails item={selected} onOpenModal={() => setModalOpen(true)} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} /> : <div className="grid h-full place-items-center text-sm text-muted">Select an item</div>}
        </div>
      </div>

      {filtersOpen && (
        <div className="drawer-backdrop lg:hidden" onMouseDown={(event) => { if (event.currentTarget === event.target) setFiltersOpen(false) }}>
          <div className="drawer left"><FilterPanel filters={filters} onSearch={(search) => setFilters((current) => ({ ...current, search }))} onToggle={toggleFilter} onClear={() => setFilters(EMPTY_FILTERS)} onClose={() => setFiltersOpen(false)} /></div>
        </div>
      )}

      {detailsOpen && selected && (
        <div className="drawer-backdrop xl:hidden" onMouseDown={(event) => { if (event.currentTarget === event.target) setDetailsOpen(false) }}>
          <div className="drawer right"><ItemDetails item={selected} onClose={() => setDetailsOpen(false)} onOpenModal={() => setModalOpen(true)} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} /></div>
        </div>
      )}

      {modalOpen && selected && <ItemModal item={selected} onClose={() => setModalOpen(false)} />}
      <button className="help-button" aria-label="About this prototype" title="Prices are a campaign aid, not official rules"><CircleHelp size={18} /></button>
    </div>
  )
}
