import { useId } from 'react'

interface ToggleSwitchProps {
  checked: boolean
  disabled?: boolean
  label: string
  description?: string
  onCheckedChange: (checked: boolean) => void
}

export function ToggleSwitch({ checked, disabled = false, label, description, onCheckedChange }: ToggleSwitchProps) {
  const generatedId = useId()
  const inputId = `toggle-${generatedId}`
  const descriptionId = description ? `${inputId}-description` : undefined

  return (
    <label htmlFor={inputId} className={`flex items-start justify-between gap-5 rounded-md border border-border bg-surface p-4 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-gold/45'}`}>
      <span className="min-w-0">
        <span className="block font-display text-xs font-semibold text-cream">{label}</span>
        {description && <span id={descriptionId} className="mt-1.5 block text-[11px] leading-5 text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          aria-label={label}
          aria-describedby={descriptionId}
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
        <span aria-hidden="true" className="relative block h-6 w-11 rounded-full border border-border bg-panel-strong shadow-inner transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-[18px] after:w-[18px] after:rounded-full after:bg-muted after:shadow after:transition-transform peer-checked:border-gold peer-checked:bg-gold/25 peer-checked:after:translate-x-5 peer-checked:after:bg-gold-bright peer-focus-visible:ring-2 peer-focus-visible:ring-gold-bright peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-panel" />
      </span>
    </label>
  )
}
