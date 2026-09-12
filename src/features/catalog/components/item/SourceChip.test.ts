import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { formatSourceLabel, formatSourceTitle, getSourceChipColors, SourceChip } from './SourceChip'

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

describe('formatSourceTitle', () => {
  it('includes the source name from the books catalog', () => {
    expect(formatSourceTitle('TCE')).toBe("Source: Tasha's Cauldron of Everything")
  })

  it('includes the source name from the adventures catalog', () => {
    expect(formatSourceTitle('LMoP')).toBe('Source: Lost Mine of Phandelver')
  })

  it('keeps an unknown source without a name', () => {
    expect(formatSourceTitle('Homebrew')).toBe('Source: Homebrew')
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

describe('SourceChip', () => {
  it('keeps static chips non-interactive', () => {
    render(createElement(SourceChip, { source: 'TCE' }))

    expect(screen.getByTitle("Source: Tasha's Cauldron of Everything").tagName).toBe('SPAN')
  })

  it('exposes a selectable chip as a pressed button', async () => {
    const user = userEvent.setup()
    let selected = true
    const onSelectedChange = (next: boolean) => { selected = next }
    render(createElement(SourceChip, { source: 'TCE', selected, onSelectedChange }))
    const chip = screen.getByRole('button', { name: "Source: Tasha's Cauldron of Everything" })

    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await user.click(chip)
    expect(selected).toBe(false)
  })
})
