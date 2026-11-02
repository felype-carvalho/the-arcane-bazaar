import { describe, expect, it } from 'vitest'
import { formatMeasurement, formatMeasurementNumber } from './conversion'
import { tableMeasurement, tokenizeMeasurements } from './tokenize'
import type { Measurement } from '../types'

function measurements(text: string, context = ''): Measurement[] {
    return tokenizeMeasurements(text, context).filter((token): token is Measurement => typeof token !== 'string')
}

describe('measurement parsing and conversion', () => {
    it.each([
        ['30 feet', '9 m (6)'],
        ['7 feet', '2.1 m (1.4)'],
        ['150/600 ft.', '45/180 m (30/120)'],
        ['5/15 ft.', '1.5/4.5 m (1/3)'],
        ['10-foot-radius', '3 m (2)'],
        ['2–4 feet', '0.6–1.2 m (0.4–0.8)'],
        ['1,000 square feet', '90 m²'],
        ['64 cubic feet', '1.7 m³'],
        ['1 mile', '1.6 km'],
        ['4 inches', '10.2 cm'],
        ['15 pounds', '6.8 kg'],
        ['4 mph', '6.4 km/h'],
        ['3 miles per hour', '4.8 km/h'],
        ['4 pints', '1.9 L'],
        ['1 quart', '946.4 ml'],
        ['2 gallons per minute', '7.6 L/min'],
        ['½ fluid ounce', '14.8 ml'],
        ['1/2 gallon', '1.9 L'],
        ['1 1/2 gallons', '5.7 L'],
        ['1½ gallons', '5.7 L'],
    ])('converts %s to %s', (text, expected) => {
        const parsed = measurements(text)
        expect(parsed).toHaveLength(1)
        expect(formatMeasurement(parsed[0], 'metric', 'en-US')).toBe(expected)
    })

    it('keeps prose, unrelated numbers, and cargo tonnage intact', () => {
        const text = 'AC 15, 2d6 damage, 150 tons, 2 hours, 100 GP and 8 ambiguous ounces.'
        expect(tokenizeMeasurements(text)).toEqual([text])
        expect(tokenizeMeasurements('A 1 in 6 chance, or 1 in a million.')).toEqual(['A 1 in 6 chance, or 1 in a million.'])
        const tokens = tokenizeMeasurements('Creates a 10-foot-radius sphere.')
        expect(tokens[0]).toBe('Creates a ')
        expect(tokens[2]).toBe('-radius sphere.')
    })

    it('distinguishes liquid ounces from mass and leaves ambiguity unchanged', () => {
        expect(measurements('4 ounces of liquid')[0].unit).toBe('fluidOunce')
        expect(measurements('8 ounces', 'Acid')[0].unit).toBe('fluidOunce')
        expect(measurements('weighs 2 ounces')[0].unit).toBe('ounce')
        expect(measurements('The ink weighs 2 ounces')[0].unit).toBe('ounce')
        expect(measurements('2 ounces')).toEqual([])
    })

    it('inherits only explicit table units and preserves dice and text cells', () => {
        expect(tableMeasurement('30', 'Speed (feet)')).toEqual({ unit: 'foot', values: [30], separator: '' })
        expect(tableMeasurement('500', 'Weight (lb.)')?.unit).toBe('pound')
        expect(tableMeasurement('10', 'd100')).toBeUndefined()
        expect(tableMeasurement('2d6', 'Weight (lb.)')).toBeUndefined()
        expect(tableMeasurement('150', 'Cargo (tons)')).toBeUndefined()
        expect(tableMeasurement('2', 'Bonus within 30 feet')).toBeUndefined()
    })

    it('formats localized numbers without losing small positive quantities', () => {
        const value = measurements('7 feet')[0]
        expect(formatMeasurement(value, 'metric', 'pt-BR')).toBe('2,1 m (1,4)')
        expect(formatMeasurementNumber(0.0001, 'en-US')).toBe('0.0001')
        expect(formatMeasurement(value, 'imperial', 'en-US')).toBe('7 ft. (1.4)')
        expect(formatMeasurement(value, 'metric', 'en-US')).toBe('2.1 m (1.4)')
    })
})
