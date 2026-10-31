import { useInterfaceTranslation } from '@/app/i18n'
import { useId } from 'react'
import { Layers3 } from 'lucide-react'
import type { Item, VariantBaseOption } from '../../types'
import { formatSourceLabel } from './SourceChip'

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

export function BaseItemSelector({ item, selectedOption, onSelect }: BaseItemSelectorProps) {
    const { t } = useInterfaceTranslation()
    const options = [...(item.variantOptions ?? [])].sort(compareBaseOptions)
    const titleId = useId()

    return (
        <section className="variant-base-card" aria-labelledby={titleId}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="eyebrow">{t("variants.configuration")}</p>
                    <h3 id={titleId} className="mt-1 font-display text-sm text-gold">{t("variants.baseItem")}</h3>
                </div>
                <Layers3 size={17} className="text-gold" />
            </div>

            {options.length ? (
                <>
                    <label className="mt-4 block">
                        <span className="field-label">{t("variants.compatibleBase")}</span>
                        <select className="field mt-1.5 w-full" value={selectedOption?.id ?? ''} onChange={(event) => onSelect(event.target.value)}>
                            <option value="" disabled>{t("variants.selectBase")}</option>
                            {options.map((option) => (
                                <option key={option.id} value={option.id}>{option.baseName} · {formatSourceLabel(option.baseSource)}</option>
                            ))}
                        </select>
                    </label>

                    {!selectedOption && (
                        <p className="mt-3 text-[11px] leading-5 text-muted">{t("variants.baseHint")}</p>
                    )}
                </>
            ) : (
                <p className="mt-3 text-[11px] leading-5 text-red-300">{t("variants.noBases")}</p>
            )}
        </section>
    )
}
