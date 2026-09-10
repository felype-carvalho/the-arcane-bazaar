import { useId } from 'react'
import { Layers3 } from 'lucide-react'
import type { Item, VariantBaseOption } from '../../types'
import { CurrencyDisplay } from '../pricing/CurrencyDisplay'
import { formatSourceLabel, SourceChip } from './SourceChip'

interface BaseItemSelectorProps {
    item: Item
    selectedOption?: VariantBaseOption
    onSelect: (optionId: string) => void
}

const SOURCE_PRIORITY = new Map([
    ['XPHB', 0],
    ['PHB', 1],
    ['XDMG', 2],
    ['DMG', 3],
])

function compareBaseOptions(left: VariantBaseOption, right: VariantBaseOption): number {
    const leftSource = left.baseSource.trim().toLocaleUpperCase('en-US')
    const rightSource = right.baseSource.trim().toLocaleUpperCase('en-US')
    const leftPriority = SOURCE_PRIORITY.get(leftSource)
    const rightPriority = SOURCE_PRIORITY.get(rightSource)

    if (leftPriority !== undefined || rightPriority !== undefined) {
        if (leftPriority === undefined) return 1
        if (rightPriority === undefined) return -1
        if (leftPriority !== rightPriority) return leftPriority - rightPriority
    } else {
        const sourceOrder = leftSource.localeCompare(rightSource)
        if (sourceOrder) return sourceOrder
    }

    return left.baseName.localeCompare(right.baseName)
}

function PriceValue({ value }: { value: number | null | undefined }) {
    return value == null ? <span className="text-muted">Variable</span> : <CurrencyDisplay valueGp={value} />
}

export function BaseItemSelector({ item, selectedOption, onSelect }: BaseItemSelectorProps) {
    const options = [...(item.variantOptions ?? [])].sort(compareBaseOptions)
    const titleId = useId()

    return (
        <section className="variant-base-card" aria-labelledby={titleId}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="eyebrow">Variant configuration</p>
                    <h3 id={titleId} className="mt-1 font-display text-sm text-gold">Base item</h3>
                </div>
                <Layers3 size={17} className="text-gold" />
            </div>

            {options.length ? (
                <>
                    <label className="mt-4 block">
                        <span className="field-label">Compatible base item</span>
                        <select className="field mt-1.5 w-full" value={selectedOption?.id ?? ''} onChange={(event) => onSelect(event.target.value)}>
                            <option value="" disabled>Select a base item</option>
                            {options.map((option) => (
                                <option key={option.id} value={option.id}>{option.baseName} · {formatSourceLabel(option.baseSource)}</option>
                            ))}
                        </select>
                    </label>

                    {selectedOption ? (
                        <div className="mt-3 border-t border-border/70 pt-3">
                            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                                <span className="truncate font-display text-xs text-cream">{selectedOption.baseName}</span>
                                <SourceChip source={selectedOption.baseSource} />
                            </div>
                            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[11px]">
                                <dt className="text-muted">Base item</dt><dd className="font-display text-cream"><PriceValue value={selectedOption.basePriceGp} /></dd>
                                <dt className="text-muted">Variant</dt><dd className="font-display text-cream"><PriceValue value={selectedOption.variantPriceGp} /></dd>
                                <dt className="border-t border-gold/20 pt-2 font-display text-gold">Combined</dt><dd className="border-t border-gold/20 pt-2 font-display text-gold-bright"><PriceValue value={selectedOption.effectivePriceGp} /></dd>
                            </dl>
                        </div>
                    ) : (
                        <p className="mt-3 text-[11px] leading-5 text-muted">Choose a compatible base item to determine this variant's price.</p>
                    )}
                </>
            ) : (
                <p className="mt-3 text-[11px] leading-5 text-red-300">No compatible base items were found for this variant.</p>
            )}
        </section>
    )
}
