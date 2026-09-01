import { useEffect, useMemo, useState } from 'react'
import { CircleHelp, Filter, Menu, Sparkles } from 'lucide-react'
import { filterAndSortItems, EMPTY_FILTERS } from '../../lib/catalog'
import { DEFAULT_MODIFIERS } from '../../lib/pricing'
import { getItems } from '../../services/catalog'
import type { Item, ItemFilters, PricingModifiers, SortDirection, SortKey } from '../../types'
import { CatalogList } from './components/CatalogList'
import { FilterPanel, type FilterGroup } from './components/FilterPanel'
import { ItemDetails } from './components/ItemDetails'
import { ItemModal } from './components/ItemModal'
import { Pagination } from './components/Pagination'

const PAGE_SIZE = 20
const INITIAL_FILTERS: ItemFilters = { ...EMPTY_FILTERS, types: ['Common'] }

export function CatalogPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filters, setFilters] = useState<ItemFilters>(INITIAL_FILTERS)
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

  useEffect(() => {
    setSelected((current) => current && filtered.some((item) => item.id === current.id) ? current : filtered[0] ?? null)
  }, [filtered])

  const toggleFilter = (group: FilterGroup, value: string) => {
    setFilters((current) => {
      const values = current[group] as string[]
      return { ...current, [group]: values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value] }
    })
  }

  const selectItem = (item: Item) => {
    setSelected(item)
    if (window.innerWidth < 1280) setDetailsOpen(true)
  }

  const sort = (key: SortKey) => {
    if (key === sortKey) setDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setDirection('asc') }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[242px] shrink-0 border-r border-border lg:block">
          <FilterPanel filters={filters} onSearch={(search) => setFilters((current) => ({ ...current, search }))} onTypeSelect={(type) => setFilters((current) => ({ ...current, types: [type] }))} onToggle={toggleFilter} onClear={() => setFilters(INITIAL_FILTERS)} />
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
              <CatalogList items={pageItems} selectedId={selected?.id} sortKey={sortKey} direction={direction} onSort={sort} onSelect={selectItem} />
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
          <div className="drawer left"><FilterPanel filters={filters} onSearch={(search) => setFilters((current) => ({ ...current, search }))} onTypeSelect={(type) => setFilters((current) => ({ ...current, types: [type] }))} onToggle={toggleFilter} onClear={() => setFilters(INITIAL_FILTERS)} onClose={() => setFiltersOpen(false)} /></div>
        </div>
      )}

      {detailsOpen && selected && (
        <div className="drawer-backdrop xl:hidden" onMouseDown={(event) => { if (event.currentTarget === event.target) setDetailsOpen(false) }}>
          <div className="drawer right"><ItemDetails item={selected} onClose={() => setDetailsOpen(false)} onOpenModal={() => setModalOpen(true)} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} /></div>
        </div>
      )}

      {modalOpen && selected && <ItemModal item={selected} onClose={() => setModalOpen(false)} />}
      <button className="help-button" aria-label="About this prototype" title="Prices are a campaign aid, not official rules"><CircleHelp size={18} /></button>
    </>
  )
}
