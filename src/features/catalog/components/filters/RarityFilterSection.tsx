import { useId, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useInterfaceTranslation } from '@/app/i18n'
import { RARITIES } from '../../model/filtering'
import type { Rarity } from '../../types'

interface RarityFilterSectionProps {
    options: readonly Rarity[]
    selected: readonly Rarity[]
    onToggle: (rarity: Rarity) => void
}

export function RarityFilterSection({ options, selected, onToggle }: RarityFilterSectionProps) {
    const { t, label } = useInterfaceTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const optionsId = useId()
    const availableRarities = RARITIES.filter((rarity) => options.includes(rarity))
    const scaleRarities = availableRarities.filter((rarity) => rarity !== 'Varies' && rarity !== 'Unknown')
    const specialRarities = availableRarities.filter((rarity) => rarity === 'Varies' || rarity === 'Unknown')

    const renderOption = (rarity: Rarity, showScale: boolean) => (
        <label key={rarity} className={`relative flex min-h-8 min-w-0 cursor-pointer items-center gap-2.5 text-xs transition-colors filter-${rarity.toLowerCase().replaceAll(' ', '-')} ${selected.includes(rarity) ? 'bg-current/15 hover:bg-current/20 focus-within:bg-current/20' : 'hover:bg-white/5 focus-within:bg-white/5'} ${showScale ? 'pl-5 pr-2' : 'justify-center rounded-sm'}`}>
            {showScale && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-current" />}
            <span className="relative flex size-4 shrink-0 items-center justify-center">
                <input
                    type="checkbox"
                    checked={selected.includes(rarity)}
                    onChange={() => onToggle(rarity)}
                    className="peer m-0 size-4 shrink-0 cursor-pointer appearance-none rounded-[3px] border border-current bg-panel-strong text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                />
                <Check aria-hidden="true" strokeWidth={3} className="pointer-events-none absolute size-3 opacity-0 peer-checked:opacity-100" />
            </span>
            <span>{label(rarity)}</span>
        </label>
    )

    return (
        <fieldset className="mt-5 border-b border-border/70 pb-4">
            <legend className="w-full">
                <button
                    type="button"
                    className="flex w-full items-center justify-between font-display text-[12px] uppercase tracking-[0.14em] text-gold"
                    aria-expanded={isOpen}
                    aria-controls={optionsId}
                    onClick={() => setIsOpen((current) => !current)}
                >
                    {t('filters.rarity')}<ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </legend>
            <div id={optionsId} className="mt-3" hidden={!isOpen}>
                {scaleRarities.length > 0 && (
                    <div className="overflow-hidden">
                        {scaleRarities.map((rarity) => renderOption(rarity, true))}
                    </div>
                )}
                {specialRarities.length > 0 && (
                    <div className={`grid grid-cols-2 gap-2 ${scaleRarities.length > 0 ? 'mt-3 border-t border-gold/40 pt-3' : ''}`}>
                        {specialRarities.map((rarity) => renderOption(rarity, false))}
                    </div>
                )}
            </div>
        </fieldset>
    )
}
