import { Tooltip } from '@/components/ui/Tooltip'
import { useInterfaceTranslation } from '@/app/i18n'
import { formatMeasurement, formatMeasurementNumber, measurementCategory } from '../model/conversion'
import { useMeasurements } from '../model/MeasurementProvider'
import type { Measurement } from '../types'

export function MeasurementValue({ measurement }: { measurement: Measurement }) {
    const { language, t } = useInterfaceTranslation()
    const preferences = useMeasurements()
    const imperial = formatMeasurement(measurement, 'imperial', language, { includeSquares: false })
    const metric = formatMeasurement(measurement, 'metric', language, { includeSquares: false })
    const displayed = formatMeasurement(measurement, preferences[measurementCategory(measurement.unit)], language)
    return <Tooltip openOnClick content={<>
        <span>{t('measurements.imperial')}: {imperial}</span>
        <span>{t('measurements.metric')}: {metric}</span>
        {measurement.unit === 'foot' && <span>{t('measurements.squares')}: ({measurement.values.map((value) => formatMeasurementNumber(value / 5, language)).join(measurement.separator)})</span>}
    </>}>
        <button type="button" className="inline cursor-help rounded-sm text-left text-gold-bright underline decoration-gold/70 underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
            {displayed}
        </button>
    </Tooltip>
}
