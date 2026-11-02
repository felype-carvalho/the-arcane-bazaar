import { useInterfaceTranslation } from '@/app/i18n'
import { MeasurementText } from '@/features/measurements'
import { Trans } from 'react-i18next'

interface ItemInformationValueProps {
    field: string
    value: string
}

// Parse source measurements before applying locale-specific numeric formatting.
export function ItemInformationValue({ field, value }: ItemInformationValueProps) {
    const { language } = useInterfaceTranslation()
    const format = (text: string) => new Intl.NumberFormat(language, { maximumFractionDigits: 4 }).format(Number(text.replaceAll(',', '')))
    const cost = /^([\d,.]+) GP (per mile per passenger|per 100 lb per mile)$/.exec(value)
    if ((field === 'Personal Travel Cost' || field === 'Shipping Cost') && cost) {
        return <Trans i18nKey={cost[2] === 'per mile per passenger' ? 'item.travelCost' : 'item.shippingCost'} values={{ value: format(cost[1]) }}
            components={{ distance: <MeasurementText text="1 mile" />, weight: <MeasurementText text="100 lb" /> }} />
    }
    if (['Crew', 'AC', 'HP', 'Damage Threshold'].includes(field)) {
        return value.replace(/\d[\d,]*(?:\.\d+)?/g, format)
    }
    return <MeasurementText text={value} context={field} />
}
