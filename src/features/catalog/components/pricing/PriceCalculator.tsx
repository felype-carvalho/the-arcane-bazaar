import { useInterfaceTranslation } from '@/app/i18n'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { ChevronDown, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { CurrencyDisplay } from './CurrencyDisplay'
import {
    calculatePricing,
    ECONOMY_OPTIONS,
    MAGIC_FREQUENCY_OPTIONS,
    MARKET_OPTIONS,
    NEGOTIATION_OPTIONS,
    REPUTATION_OPTIONS,
    type PricingModifierOption,
} from '../../model/pricing'
import type { Item, PricingModifiers, VariantBaseOption } from '../../types'
import { SourceChip } from '../item/SourceChip'

interface PriceCalculatorProps {
    item: Item
    effectiveItem?: Item
    pendingSelection?: 'groupOption' | 'baseItem'
    selectedOption?: VariantBaseOption
    modifiers: PricingModifiers
    setModifiers: Dispatch<SetStateAction<PricingModifiers>>
    manualPrice: string
    setManualPrice: (value: string) => void
}

function PriceValue({ value }: { value: number | null | undefined }) {
    const { t } = useInterfaceTranslation()
    return value == null ? <span className="text-muted">{t("pricing.variable")}</span> : <CurrencyDisplay valueGp={value} />
}

export function PriceCalculator({ item, effectiveItem, pendingSelection, selectedOption, modifiers, setModifiers, manualPrice, setManualPrice }: PriceCalculatorProps) {
    const { t, label, percent } = useInterfaceTranslation()
    const [customName, setCustomName] = useState('')
    const [customPercent, setCustomPercent] = useState('')
    const manualValue = manualPrice === '' ? null : Number(manualPrice)
    const pending = pendingSelection ?? (!effectiveItem && item.variantOptions ? 'baseItem' : undefined)
    const pricingItem = pending ? undefined : effectiveItem ?? item
    const result = pricingItem ? calculatePricing(pricingItem, modifiers, manualValue) : null

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
                    <p className="eyebrow">{t("pricing.eyebrow")}</p>
                    <h3 id="calculator-title" className="mt-1 font-display text-sm text-cream">{t("pricing.title")}</h3>
                </div>
                <SlidersHorizontal size={17} className="text-gold" />
            </div>

            {selectedOption && (
                <div className="selected-base-price-card mb-4">
                    <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                        <span className="truncate font-display text-xs text-cream">{selectedOption.baseName}</span>
                        <SourceChip source={selectedOption.baseSource} />
                    </div>
                    <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[11px]">
                        <dt className="text-muted">{t("variants.baseItem")}</dt><dd className="font-display text-cream"><PriceValue value={selectedOption.basePriceGp} /></dd>
                        <dt className="text-muted">{t("pricing.variant")}</dt><dd className="font-display text-cream"><PriceValue value={selectedOption.variantPriceGp} /></dd>
                        <dt className="border-t border-gold/20 pt-2 font-display text-gold">{t("pricing.combined")}</dt><dd className="border-t border-gold/20 pt-2 font-display text-gold-bright"><PriceValue value={selectedOption.effectivePriceGp} /></dd>
                    </dl>
                </div>
            )}

            {pricingItem?.basePriceGp == null && pricingItem && (
                <label className="mb-4 block">
                    <span className="field-label">{t("pricing.manualPrice")}</span>
                    <input className="field mt-1.5 w-full" type="number" min="1" value={manualPrice} onChange={(event) => setManualPrice(event.target.value)} placeholder={t("pricing.manualPricePlaceholder")} />
                </label>
            )}

            {!pricingItem ? (
                <div className="mt-5 rounded border border-gold/20 bg-gold/5 p-3 text-[11px] leading-5 text-amber-100/70">{pending === 'groupOption' ? t("pricing.pendingVersion") : t("pricing.pendingBase")}</div>
            ) : result ? (
                <div className="mt-5">
                    <output className="base-price-card" aria-label={t("pricing.basePrice")}>
                        <span>{t("pricing.basePrice")}</span>
                        <strong><CurrencyDisplay valueGp={result.basePrice} /></strong>
                    </output>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="price-result buy">
                            <span>{t("pricing.buy")}</span>
                            <strong><CurrencyDisplay valueGp={result.buyPrice} /></strong>
                            <small>{percent(result.buyTotalPercent)} {t("pricing.adjustmentSuffix")}</small>
                        </div>
                        <div className="price-result sell">
                            <span>{t("pricing.sell")}</span>
                            <strong><CurrencyDisplay valueGp={result.sellPrice} /></strong>
                            <small>{t("pricing.sellBase")} {percent(result.sellTotalPercent)}</small>
                        </div>
                    </div>
                    <div className="breakdown mt-3">
                        <div className="breakdown-title">{t("pricing.breakdown")}</div>
                        <div className="space-y-1.5 border-t border-border/70 px-3 py-2">
                            <div className="grid grid-cols-[1fr_44px_44px] gap-1 font-display text-[10px] leading-4 uppercase tracking-[.08em] text-gold">
                                <span>{t("pricing.adjustment")}</span><span className="text-right">{t("pricing.buyAbbreviation")}</span><span className="text-right">{t("pricing.sellAbbreviation")}</span>
                            </div>
                            {result.adjustments.map((adjustment, index) => (
                                <div key={`${adjustment.group ? `${label(adjustment.group)} · ${label(adjustment.optionLabel ?? '')}` : adjustment.label}-${index}`} className="grid grid-cols-[1fr_44px_44px] gap-1 text-[11px] leading-4">
                                    <span className="breakdown-label">{adjustment.group ? `${label(adjustment.group)} · ${label(adjustment.optionLabel ?? '')}` : adjustment.label}</span>
                                    <Percentage value={adjustment.buyPercent} />
                                    <Percentage value={adjustment.sellPercent} />
                                </div>
                            ))}
                            <div className="breakdown-total grid grid-cols-[1fr_44px_44px] gap-1 pt-2 text-[11px] leading-4">
                                <span>{t("pricing.total")}</span>
                                <Percentage value={result.buyTotalPercent} />
                                <Percentage value={result.sellTotalPercent} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-5 rounded border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-5 text-amber-100/70">{t("pricing.positivePriceHint")}</div>
            )}

            <details className="breakdown group mt-3">
                <summary>{t("pricing.modifiers")} <ChevronDown size={13} /></summary>
                <div className="border-t border-border/70 px-3 py-3">
                    <div className="grid grid-cols-1 gap-3">
                        <SelectField label={t("pricing.economy")} value={modifiers.economy} onChange={(economy) => setModifiers((current) => ({ ...current, economy }))} options={ECONOMY_OPTIONS} />
                        <SelectField label={t("pricing.market")} value={modifiers.market} onChange={(market) => setModifiers((current) => ({ ...current, market }))} options={MARKET_OPTIONS} />
                        <SelectField label={t("pricing.reputation")} value={modifiers.reputation} onChange={(reputation) => setModifiers((current) => ({ ...current, reputation }))} options={REPUTATION_OPTIONS} />
                        <SelectField label={t("pricing.negotiation")} value={modifiers.negotiation} onChange={(negotiation) => setModifiers((current) => ({ ...current, negotiation }))} options={NEGOTIATION_OPTIONS} />
                        {pricingItem?.type === 'Magic' && <SelectField label={t("pricing.magicFrequency")} value={modifiers.magicFrequency} onChange={(magicFrequency) => setModifiers((current) => ({ ...current, magicFrequency }))} options={MAGIC_FREQUENCY_OPTIONS} />}
                    </div>

                    <div className="mt-4 border-t border-border/70 pt-4">
                        <p className="field-label">{t("pricing.customModifier")}</p>
                        <div className="mt-1.5 grid grid-cols-[1fr_80px_36px] gap-2">
                            <input aria-label={t("pricing.modifierName")} className="field min-w-0" value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder={t("pricing.modifierNamePlaceholder")} />
                            <input aria-label={t("pricing.modifierPercent")} className="field min-w-0" type="number" value={customPercent} onChange={(event) => setCustomPercent(event.target.value)} placeholder="%" onKeyDown={(event) => { if (event.key === 'Enter') addModifier() }} />
                            <button className="icon-button border border-gold/30 text-gold" onClick={addModifier} aria-label={t("pricing.addModifier")}><Plus size={16} /></button>
                        </div>
                        {modifiers.custom.length > 0 && (
                            <ul className="mt-2 space-y-1.5">
                                {modifiers.custom.map((modifier) => (
                                    <li key={modifier.id} className="flex items-center justify-between rounded border border-border bg-surface px-2.5 py-2 text-[11px] text-cream">
                                        <span>{modifier.name} <span className="text-gold">{percent(modifier.percent)}</span></span>
                                        <button className="text-muted hover:text-red-400" onClick={() => setModifiers((current) => ({ ...current, custom: current.custom.filter((entry) => entry.id !== modifier.id) }))} aria-label={t("common.removeNamed", { name: modifier.name })}><Trash2 size={13} /></button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </details>


        </section>
    )
}

function Percentage({ value }: { value: number }) {
    const { percent } = useInterfaceTranslation()
    const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
    return <span className={`breakdown-percentage ${tone}`}>{percent(value)}</span>
}

function SelectField<T extends string>({ label, value, onChange, options }: { label: string, value: T, onChange: (value: T) => void, options: readonly PricingModifierOption<T>[] }) {
    const { t, label: translateLabel, percent } = useInterfaceTranslation()
    return (
        <label className="block min-w-0">
            <span className="field-label">{label}</span>
            <select className="field mt-1.5 w-full" value={value} onChange={(event) => onChange(event.target.value as T)}>
                {options.map((option) => <option key={option.value} value={option.value}>{translateLabel(option.label)} · {option.isBase ? `${t("pricing.baseOption")} (` : ''}{t("pricing.buyAbbreviation")} {percent(option.buyPercent)} | {t("pricing.sellAbbreviation")} {percent(option.sellPercent)}{option.isBase ? ')' : ''}</option>)}
            </select>
        </label>
    )
}
