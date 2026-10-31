import { useInterfaceTranslation } from '@/app/i18n'
import { CurrencyConverter } from '../../model/currency'

interface CurrencyDisplayProps {
    valueGp: number
    className?: string
}


export function CurrencyDisplay({ valueGp, className = '' }: CurrencyDisplayProps) {
    const { number, label } = useInterfaceTranslation()
    const parts = CurrencyConverter.fromGp(valueGp)

    return (
        <span className={`currency-display ${className}`.trim()}>
            {parts.map((part) => (
                <span key={part.unit} className={`currency-part currency-${part.unit.toLocaleLowerCase('en-US')}`}>
                    {number(part.value)} {label(part.unit)}
                </span>
            ))}
        </span>
    )
}
