import { type Dispatch, type SetStateAction } from 'react'
import { BookOpen, Coins, Sparkles, Tag, X } from 'lucide-react'
import { CATEGORY_ICONS } from '../../../lib/items/categories'
import { formatGp } from '../../../lib/pricing'
import type { Item, PricingModifiers } from '../../../types'
import { RarityBadge } from './ItemBadges'
import { PriceCalculator } from './PriceCalculator'

interface ItemDetailsProps {
  item: Item
  onOpenModal: () => void
  onClose?: () => void
  modifiers: PricingModifiers
  setModifiers: Dispatch<SetStateAction<PricingModifiers>>
  manualPrice: string
  setManualPrice: (value: string) => void
}

export function ItemDetails({ item, onOpenModal, onClose, modifiers, setModifiers, manualPrice, setManualPrice }: ItemDetailsProps) {
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
        <DetailFact label="Category" value={`${CATEGORY_ICONS[item.category]} ${item.category}`} />
        <DetailFact label="Subtype" value={item.subtype} />
        <DetailFact label="Weight" value={item.weight} />
        <DetailFact label="Attunement" value={item.attunement ? 'Required' : 'Not required'} />
      </div>

      <div className="border-b border-border px-5 py-4">
        <p className="eyebrow">Availability &amp; price</p>
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

export function DetailFact({ label, value }: { label: string, value: string }) {
  return <div><p className="eyebrow">{label}</p><p className="mt-1.5 font-display text-[11px] font-semibold leading-5 text-cream">{value}</p></div>
}
