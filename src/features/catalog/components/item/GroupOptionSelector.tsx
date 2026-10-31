import { useInterfaceTranslation } from '@/app/i18n'
import { useId } from 'react'
import type { Item, ItemGroupOption } from '../../types'

interface GroupOptionSelectorProps {
    item: Item
    selectedOption?: ItemGroupOption
    onSelect: (optionId: string) => void
}

export function GroupOptionSelector({ item, selectedOption, onSelect }: GroupOptionSelectorProps) {
    const { t, label } = useInterfaceTranslation()
    const titleId = useId()
    const options = item.groupOptions ?? []
    const title = options.some((option) => option.kind === 'inferredInitialStage') ? 'Evolution stage' : 'Item version'
    return (
        <section className="variant-base-card" aria-labelledby={titleId}>
            <h3 id={titleId} className="font-display text-sm text-gold">{label(title)}</h3>
            {options.length ? (
                <label className="mt-4 block min-w-0">
                    <span className="field-label">{label(title)}</span>
                    <select className="field mt-1.5 w-full min-w-0" value={selectedOption?.id ?? ''} onChange={(event) => onSelect(event.target.value)}>
                        <option value="" disabled>{t("variants.selectVersion")}</option>
                        {options.map((option) => <option key={option.id} value={option.id}>{option.label} — {label(option.resolvedItem.rarity)}{option.rarityOrigin === 'inferred' ? t("variants.inferredSuffix") : ''}</option>)}
                    </select>
                </label>
            ) : <p className="mt-3 text-[11px] text-red-300">{t("variants.noVersions")}</p>}
            {selectedOption?.rarityOrigin === 'inferred' && <p className="mt-3 text-[11px] text-muted">{t("variants.inferredRarityHint")}</p>}
            {selectedOption?.rarityOrigin === 'unknown' && <p className="mt-3 text-[11px] text-muted">{t("variants.unknownRarityHint")}</p>}
        </section>
    )
}
