import { describe, expect, it } from 'vitest'
import { CurrencyConverter } from './currency'

describe('CurrencyConverter', () => {
  it.each([
    [0.5, [{ unit: 'SP', value: 5 }]],
    [0.03, [{ unit: 'CP', value: 3 }]],
    [0.25, [{ unit: 'SP', value: 2 }, { unit: 'CP', value: 5 }]],
    [2.25, [{ unit: 'GP', value: 2 }, { unit: 'SP', value: 2 }, { unit: 'CP', value: 5 }]],
    [0.002, [{ unit: 'CP', value: 0.2 }]],
  ])('converts %s GP into its coin denominations', (valueGp, expected) => {
    expect(CurrencyConverter.fromGp(valueGp)).toEqual(expected)
  })

  it('preserves large GP values and omits empty denominations', () => {
    expect(CurrencyConverter.fromGp(4_000)).toEqual([{ unit: 'GP', value: 4_000 }])
  })

  it('represents zero as zero GP', () => {
    expect(CurrencyConverter.fromGp(0)).toEqual([{ unit: 'GP', value: 0 }])
  })

  it('rounds to three decimal places of CP and carries into larger coins', () => {
    expect(CurrencyConverter.fromGp(0.099_999_9)).toEqual([{ unit: 'SP', value: 1 }])
    expect(CurrencyConverter.fromGp(0.000_011_25)).toEqual([{ unit: 'CP', value: 0.001 }])
    expect(CurrencyConverter.normalizeGp(2.250_000_004)).toBe(2.25)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid value %s', (valueGp) => {
    expect(() => CurrencyConverter.fromGp(valueGp)).toThrow(RangeError)
    expect(() => CurrencyConverter.normalizeGp(valueGp)).toThrow(RangeError)
  })
})
