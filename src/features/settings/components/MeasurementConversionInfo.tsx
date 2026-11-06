import { Tooltip } from '@/components/ui/Tooltip'
import { useInterfaceTranslation } from '@/app/i18n'
import { Info } from 'lucide-react'

export function MeasurementConversionInfo() {
    const { t } = useInterfaceTranslation()
    return <Tooltip content={t('measurements.conversionInfo')} openOnClick>
        <button type="button" aria-label={t('measurements.conversionInfoLabel')}
            className="inline-flex shrink-0 cursor-help items-center justify-center rounded-sm p-1 text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
            <Info size={15} aria-hidden="true" />
        </button>
    </Tooltip>
}
