import { useState, type Dispatch, type SetStateAction } from 'react'
import { ChevronDown, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { CurrencyDisplay } from '../../../components/currency/CurrencyDisplay'
import { calculatePricing, signedLabel } from '../../../lib/pricing'
import type {
  Economy,
  Item,
  MagicFrequency,
  Market,
  Negotiation,
  PricingModifiers,
  Reputation,
} from '../../../types'

interface PriceCalculatorProps {
  item: Item
  modifiers: PricingModifiers
  setModifiers: Dispatch<SetStateAction<PricingModifiers>>
  manualPrice: string
  setManualPrice: (value: string) => void
}

export function PriceCalculator({ item, modifiers, setModifiers, manualPrice, setManualPrice }: PriceCalculatorProps) {
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
        <SelectField label="Economy" value={modifiers.economy} onChange={(value) => setModifiers((current) => ({ ...current, economy: value as Economy }))} options={[["recession", "Recession · −20%"], ["stable", "Stable · 0%"], ["thriving", "Thriving · +15%"]]} />
        <SelectField label="Market" value={modifiers.market} onChange={(value) => setModifiers((current) => ({ ...current, market: value as Market }))} options={[["oversupply", "Oversupply · −20%"], ["balanced", "Balanced · 0%"], ["highDemand", "High demand · +25%"]]} />
        <SelectField label="Reputation" value={modifiers.reputation} onChange={(value) => setModifiers((current) => ({ ...current, reputation: value as Reputation }))} options={[["unknown", "Unknown · 0%"], ["trusted", "Trusted · ±5%"], ["celebrated", "Celebrated · ±10%"]]} />
        <SelectField label="Negotiation" value={modifiers.negotiation} onChange={(value) => setModifiers((current) => ({ ...current, negotiation: value as Negotiation }))} options={[["poor", "Poor · ±10%"], ["fair", "Fair · 0%"], ["skilled", "Skilled · ±10%"]]} />
        {item.type === 'Magic' && <div className="col-span-2"><SelectField label="Magic frequency" value={modifiers.magicFrequency} onChange={(value) => setModifiers((current) => ({ ...current, magicFrequency: value as MagicFrequency }))} options={[["rare", "Rare · +25%"], ["standard", "Standard · 0%"], ["abundant", "Abundant · −15%"]]} /></div>}
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
          <div className="mb-2 flex items-center justify-between text-[10px] text-muted"><span>Base price</span><strong className="font-display text-cream"><CurrencyDisplay valueGp={result.basePrice} /></strong></div>
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
              <strong><CurrencyDisplay valueGp={result.buyPrice} /></strong>
              <small>{signedLabel(result.buyTotalPercent)} adjustment</small>
            </div>
            <div className="price-result sell">
              <span>Sell to merchant</span>
              <strong><CurrencyDisplay valueGp={result.sellPrice} /></strong>
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
