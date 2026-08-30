import type { CSSProperties } from 'react'

export interface SourceChipProps {
  source: string
}

const SOURCE_LABELS = {
  DMG: "DMG'14",
  XDMG: "DMG'24",
  PHB: "PHB'14",
  XPHB: "PHB'24",
  MM: "MM'14",
  XMM: "MM'25",
} as const

export function formatSourceLabel(source: string): string {
  const normalizedSource = source.trim().toLocaleUpperCase('en-US')
  return SOURCE_LABELS[normalizedSource as keyof typeof SOURCE_LABELS] ?? source
}

export function getSourceChipColors(source: string): CSSProperties {
  let hash = 2166136261
  for (const character of source.trim().toLocaleUpperCase('en-US')) {
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

export function SourceChip({ source }: SourceChipProps) {
  return <span className="source-chip" style={getSourceChipColors(source)} title={`Source: ${formatSourceLabel(source)}`}>{formatSourceLabel(source)}</span>
}
