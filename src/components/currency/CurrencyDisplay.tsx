import { CurrencyConverter } from '../../lib/currency'

interface CurrencyDisplayProps {
  valueGp: number
  className?: string
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 3,
})

export function CurrencyDisplay({ valueGp, className = '' }: CurrencyDisplayProps) {
  const parts = CurrencyConverter.fromGp(valueGp)

  return (
    <span className={`currency-display ${className}`.trim()}>
      {parts.map((part) => (
        <span key={part.unit} className={`currency-part currency-${part.unit.toLocaleLowerCase('en-US')}`}>
          {numberFormatter.format(part.value)} {part.unit}
        </span>
      ))}
    </span>
  )
}
