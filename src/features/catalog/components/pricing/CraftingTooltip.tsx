import { Gavel } from 'lucide-react'
import { useInterfaceTranslation } from '@/app/i18n'
import { Tooltip } from '@/components/ui/Tooltip'
import { craftingEstimate } from '../../model/base-pricing'
import { CurrencyDisplay } from './CurrencyDisplay'

export function CraftingTooltip({ basePriceGp }: { basePriceGp: number }) {
    const { t, number } = useInterfaceTranslation()
    const estimate = craftingEstimate(basePriceGp)
    if (!estimate) return null

    return <Tooltip openOnClick content={<>
        <span className="font-display text-gold-bright">{t('pricing.crafting.title')}</span>
        <span className="flex items-center gap-2">{t('pricing.crafting.cost')} <CurrencyDisplay valueGp={estimate.costGp} /></span>
        <span>{t('pricing.crafting.days', { value: number(estimate.days) })}</span>
        <span>{t('pricing.crafting.hours', { value: number(estimate.hours) })}</span>
        <span className="text-muted">{t('pricing.crafting.rule')}</span>
    </>}>
        <button type="button" className="inline-flex size-7 shrink-0 items-center justify-center rounded text-amber-600 hover:bg-gold/10 hover:text-amber-400 focus-visible:outline-2 focus-visible:outline-gold" aria-label={t('pricing.crafting.title')}>
            <Gavel size={17} aria-hidden="true" />
        </button>
    </Tooltip>
}
