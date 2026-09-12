import type { CSSProperties } from 'react'
import { getSourceName, normalizeSource } from '../../model/sources'

interface StaticSourceChipProps {
  source: string
  selected?: never
  disabled?: never
  onSelectedChange?: never
}

interface SelectableSourceChipProps {
  source: string
  selected: boolean
  disabled?: boolean
  onSelectedChange: (selected: boolean) => void
}

export type SourceChipProps = StaticSourceChipProps | SelectableSourceChipProps

const SOURCE_LABELS = {
  DMG: "DMG'14",
  XDMG: "DMG'24",
  PHB: "PHB'14",
  XPHB: "PHB'24",
  MM: "MM'14",
  XMM: "MM'25",
} as const

export function formatSourceLabel(source: string): string {
  const normalizedSource = normalizeSource(source)
  return SOURCE_LABELS[normalizedSource as keyof typeof SOURCE_LABELS] ?? source
}

export function formatSourceTitle(source: string): string {
  const sourceName = getSourceName(source)
  const sourceLabel = formatSourceLabel(source)
  const sourceDescription = sourceName && sourceLabel === source
    ? `${sourceName}` : sourceLabel

  return `Source: ${sourceDescription}`
}

export function getSourceChipColors(source: string): CSSProperties {
  let hash = 2166136261
  for (const character of normalizeSource(source)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  const unsignedHash = hash >>> 0
  const hue = unsignedHash % 360
  const saturation = 58 + ((unsignedHash >>> 8) % 19)
  const textLightness = 74 + ((unsignedHash >>> 16) % 9)

  return {
    backgroundColor: `hsl(${hue} ${saturation}% 18% / 0.82)`,
    borderColor: `hsl(${hue} ${saturation}% 52% / 0.72)`,
    color: `hsl(${hue} ${Math.min(saturation + 8, 90)}% ${textLightness}%)`,
  }
}

export function SourceChip(props: SourceChipProps) {
  const { source } = props
  const title = formatSourceTitle(source)
  const content = formatSourceLabel(source)
  const style = getSourceChipColors(source)

  if (typeof props.onSelectedChange === 'function') {
    return (
      <button
        type="button"
        className="source-chip selectable"
        style={style}
        title={title}
        aria-label={title}
        aria-pressed={props.selected}
        disabled={props.disabled}
        onClick={() => props.onSelectedChange(!props.selected)}
      >
        {content}
      </button>
    )
  }

  return <span className="source-chip" style={style} title={title}>{content}</span>
}
