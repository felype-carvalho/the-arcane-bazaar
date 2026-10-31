import { useInterfaceTranslation } from '@/app/i18n'

interface ItemInformationValueProps {
    field: string
    value: string
}

// Only normalize numbers in known structured fields, never in item prose or names.
export function ItemInformationValue({ field, value }: ItemInformationValueProps) {
    const { t, label, language } = useInterfaceTranslation()
    if (language === 'en-US') return value
    const format = (text: string) => new Intl.NumberFormat(language, { maximumFractionDigits: 4 }).format(Number(text.replaceAll(',', '')))
    const cost = /^([\d,.]+) GP (per mile per passenger|per 100 lb per mile)$/.exec(value)
    if ((field === 'Personal Travel Cost' || field === 'Shipping Cost') && cost) {
        return cost[2] === 'per mile per passenger'
            ? t("item.travelCost", { value: format(cost[1]) })
            : t("item.shippingCost", { value: format(cost[1]) })
    }
    if (['Speed', 'Carrying Capacity', 'Crew', 'AC', 'HP', 'Damage Threshold', label('Weight')].includes(field)) {
        return value.replace(/\d[\d,]*(?:\.\d+)?/g, format)
    }
    return value
}
