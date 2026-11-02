import { useInterfaceTranslation } from '@/app/i18n'
import { measurementCategory, measurementUnitLabel } from '../model/conversion'
import { useMeasurements } from '../model/MeasurementProvider'
import { replaceTableUnit, tableMeasurementUnit } from '../model/tokenize'
import { MeasurementText } from './MeasurementText'

export function MeasurementTableHeading({ text }: { text: string }) {
    const { language } = useInterfaceTranslation()
    const preferences = useMeasurements()
    const unit = tableMeasurementUnit(text)
    const heading = unit ? replaceTableUnit(text, measurementUnitLabel(unit, preferences[measurementCategory(unit)], language)) : text
    return <MeasurementText text={heading} />
}
