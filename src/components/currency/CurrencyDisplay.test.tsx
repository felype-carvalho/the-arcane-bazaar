import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CurrencyDisplay } from './CurrencyDisplay'

describe('CurrencyDisplay', () => {
  it('renders mixed denominations with their respective color classes', () => {
    render(<CurrencyDisplay valueGp={2.25} />)

    expect(screen.getByText('2 GP')).toHaveClass('currency-gp')
    expect(screen.getByText('2 SP')).toHaveClass('currency-sp')
    expect(screen.getByText('5 CP')).toHaveClass('currency-cp')
  })

  it('formats fractional copper and large GP values without trailing zeroes', () => {
    const { rerender } = render(<CurrencyDisplay valueGp={0.002} />)
    expect(screen.getByText('0.2 CP')).toBeInTheDocument()

    rerender(<CurrencyDisplay valueGp={4_000} />)
    expect(screen.getByText('4,000 GP')).toBeInTheDocument()
  })
})
