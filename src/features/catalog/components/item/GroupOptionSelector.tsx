import { Tooltip } from '@/components/ui/Tooltip'
import { useInterfaceTranslation } from '@/app/i18n'
import { groupOptionName, groupOptionNameTooltip } from '../../model/item-translations'
import { RARITIES } from '../../model/filtering'
import { useId } from 'react'
import type { Item, ItemGroupOption } from '../../types'

interface GroupOptionSelectorProps {
    item: Item
    selectedOption?: ItemGroupOption
    onSelect: (optionId: string) => void
}

export function GroupOptionSelector({ item, selectedOption, onSelect }: GroupOptionSelectorProps) {
    const { t, label, language } = useInterfaceTranslation()
    const titleId = useId()
    const options = [...(item.groupOptions ?? [])].sort((left, right) => {
        if (left.kind !== right.kind) return left.kind === 'inferredInitialStage' ? -1 : 1
        return RARITIES.indexOf(left.resolvedItem.rarity) - RARITIES.indexOf(right.resolvedItem.rarity)
            || new Intl.Collator(language).compare(groupOptionName(left, language), groupOptionName(right, language))
            || left.id.localeCompare(right.id)
    })
    const title = options.some((option) => option.kind === 'inferredInitialStage') ? 'Evolution stage' : 'Item version'
    return (
        <section className="variant-base-card" aria-labelledby={titleId}>
            <h3 id={titleId} className="font-display text-sm text-gold">{label(title)}</h3>
            {options.length ? (
                <label className="mt-4 block min-w-0">
                    <span className="field-label">{label(title)}</span>
                    <Tooltip content={selectedOption && groupOptionNameTooltip(selectedOption)}><select className="field mt-1.5 w-full min-w-0" value={selectedOption?.id ?? ''} onChange={(event) => onSelect(event.target.value)}>
                        <option value="" disabled>{t("variants.selectVersion")}</option>
                        {options.map((option) => <option key={option.id} value={option.id}>{groupOptionName(option, language)} — {label(option.resolvedItem.rarity)}{option.rarityOrigin === 'inferred' ? t("variants.inferredSuffix") : ''}</option>)}
                    </select></Tooltip>
                </label>
            ) : <p className="mt-3 text-[11px] text-red-300">{t("variants.noVersions")}</p>}
            {selectedOption?.rarityOrigin === 'inferred' && <p className="mt-3 text-[11px] text-muted">{t("variants.inferredRarityHint")}</p>}
            {selectedOption?.rarityOrigin === 'unknown' && <p className="mt-3 text-[11px] text-muted">{t("variants.unknownRarityHint")}</p>}
        </section>
    )
}
