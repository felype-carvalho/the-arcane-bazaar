import { Search } from 'lucide-react'
import { CATEGORY_ICONS } from '../../../lib/items/categories'
import { formatGp } from '../../../lib/pricing'
import type { Item, SortDirection, SortKey } from '../../../types'
import { RarityBadge, TypeMark } from './ItemBadges'
import { SourceChip } from './SourceChip'

interface CatalogListProps {
  items: Item[]
  selectedId?: string
  sortKey: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
  onSelect: (item: Item) => void
}

export function formatCatalogItemName(name: string): string {
  const match = name.match(/^(\+[1-3])\s+(.+)$/)
  return match ? `${match[2]}, ${match[1]}` : name
}

export function CatalogList({ items, selectedId, sortKey, direction, onSort, onSelect }: CatalogListProps) {
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
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[12px] font-semibold text-cream">{formatCatalogItemName(item.name)}</span>
                    <SourceChip source={item.source} />
                  </span>
                </td>
                <td>
                  <TypeMark type={item.type} />
                  <p className="mt-1 text-[10px] text-muted">{CATEGORY_ICONS[item.category]} {item.category}</p>
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
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 truncate font-display text-xs font-semibold text-cream">{formatCatalogItemName(item.name)}</span>
                <SourceChip source={item.source} />
              </span>
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
