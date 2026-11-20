import { CircleHelp } from 'lucide-react'
import { useInterfaceTranslation } from '@/app/i18n'
import { Tooltip } from '@/components/ui/Tooltip'
import { RARITY_BASE_PRICES_GP, SPELL_SCROLL_PRICES_GP } from '../../model/base-pricing'
import { CurrencyDisplay } from './CurrencyDisplay'

export function PricingHelp() {
    const { t, label, number } = useInterfaceTranslation()
    return <Tooltip openOnClick content={<>
        <span className="font-display text-gold-bright">{t('pricing.help.title')}</span>
        <span>{t('pricing.help.precedence')}</span>
        <span className="mt-1 font-semibold">{t('pricing.help.rarity')}</span>
        {Object.entries(RARITY_BASE_PRICES_GP).map(([rarity, price]) => <span key={rarity} className="flex justify-between gap-3">
            <span>{label(rarity)}</span><CurrencyDisplay valueGp={price} />
        </span>)}
        <span className="text-muted">{t('pricing.help.consumables')}</span>
        <span className="mt-1 font-semibold">{t('pricing.help.scrolls')}</span>
        {SPELL_SCROLL_PRICES_GP.map((price, level) => <span key={level} className="flex justify-between gap-3">
            <span>{level === 0 ? t('pricing.help.cantrip') : t('pricing.help.level', { value: number(level) })}</span><CurrencyDisplay valueGp={price} />
        </span>)}
        <span className="text-muted">{t('pricing.help.variable')}</span>
    </>}>
        <button type="button" className="inline-flex size-6 shrink-0 items-center justify-center rounded text-gold hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-gold" aria-label={t('pricing.help.title')}>
            <CircleHelp size={15} aria-hidden="true" />
        </button>
    </Tooltip>
}
