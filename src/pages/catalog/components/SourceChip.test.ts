import { describe, expect, it } from 'vitest'
import { formatSourceLabel, getSourceChipColors } from './SourceChip'

describe('formatSourceLabel', () => {
  it.each([
    ['DMG', "DMG'14"],
    ['XDMG', "DMG'24"],
    ['PHB', "PHB'14"],
    ['XPHB', "PHB'24"],
    ['MM', "MM'14"],
    ['XMM', "MM'25"],
  ])('formats %s as %s', (source, expected) => {
    expect(formatSourceLabel(source)).toBe(expected)
  })

  it('keeps other source labels unchanged', () => {
    expect(formatSourceLabel('TCE')).toBe('TCE')
  })
})

describe('getSourceChipColors', () => {
  it('keeps each source color stable and differentiates expansions', () => {
    expect(getSourceChipColors('XDMG')).toEqual(getSourceChipColors('xdmg'))

    const expansionColors = ['XDMG', 'DMG', 'XPHB', 'PHB', 'TCE', 'XGE']
      .map((source) => JSON.stringify(getSourceChipColors(source)))

    expect(new Set(expansionColors).size).toBe(expansionColors.length)
  })
})
