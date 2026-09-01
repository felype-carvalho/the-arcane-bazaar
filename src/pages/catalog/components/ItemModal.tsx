import { useEffect, useRef } from 'react'
import { Coins, Shield, Sparkles, Swords, X } from 'lucide-react'
import { CurrencyDisplay } from '../../../components/currency/CurrencyDisplay'
import type { Item } from '../../../types'
import { DetailFact } from './ItemDetails'
import { itemTypeLabel, RarityBadge } from './ItemBadges'

interface ItemModalProps {
  item: Item
  onClose: () => void
}

export function ItemModal({ item, onClose }: ItemModalProps) {
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
          <div className="flex flex-wrap gap-2"><RarityBadge rarity={item.rarity} /><span className="type-pill"><Sparkles size={11} /> {itemTypeLabel(item.type)}</span><span className="tag-pill">{item.availability}</span></div>
          <p className="mt-6 max-w-2xl font-display text-sm leading-7 text-cream">{item.description}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sheet-fact"><Swords size={17} /><DetailFact label="Category" value={item.category} /></div>
            <div className="sheet-fact"><Shield size={17} /><DetailFact label="Subtype" value={item.subtype} /></div>
            <div className="sheet-fact"><Coins size={17} /><DetailFact label="Base price" value={item.basePriceGp == null ? 'Variable' : <CurrencyDisplay valueGp={item.basePriceGp} />} /></div>
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
