import type { Measurement, MeasurementToken, MeasurementUnit } from '../types'

const fractionValues: Record<string, number> = { '½': 1 / 2, '¼': 1 / 4, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8 }
const numberPattern = String.raw`(?:\d[\d,]*(?:\.\d+)?(?:\s+\d+\/\d+|[½¼¾⅓⅔⅛⅜⅝⅞])?|[½¼¾⅓⅔⅛⅜⅝⅞])`
const quantityPattern = `${numberPattern}(?:\\s*(?:/|[-–]|to)\\s*${numberPattern})?`
const unitPattern = String.raw`(?:square[\s-]+(?:feet|foot)|cubic[\s-]+(?:feet|foot)|(?:sq\.?\s*ft\.?|ft[²³]|cu\.?\s*ft\.?)|miles?\s+per\s+hour|mph|fluid[\s-]+ounces?|fl\.?\s*oz\.?|feet|foot|ft\.?|miles?|mi\.?|inches|inch|in\.?|pounds?|lbs?\.?|ounces?|oz\.?|pints?|pt\.?|quarts?|qt\.?|gallons?|gal\.?)`
const measurementPattern = new RegExp(`(?<![\\w./])(${quantityPattern})[\\s-]+(${unitPattern})(?![a-zA-Z²³])(?:\\s+(per minute)|/min)?`, 'gi')
const liquidContext = /\b(liquid|water|wine|beer|oil|acid|poison|honey|mayonnaise|vinegar|potion|fluid|ink|perfume|milk)\b/i
const weightContext = /\b(weighs?|weight|mass|powder|dust|gold|silver)\b/i

function parseNumber(text: string): number {
    const normalized = text.trim().replaceAll(',', '')
    const fraction = normalized.slice(-1)
    if (fraction in fractionValues) return Number(normalized.slice(0, -1).trim() || 0) + fractionValues[fraction]
    const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(normalized)
    if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
    return Number(normalized)
}

function identifyUnit(text: string, context: string): MeasurementUnit | undefined {
    const unit = text.toLowerCase().replaceAll('.', '').replaceAll('-', ' ').replace(/\s+/g, ' ')
    if (/^(square|sq)|²/.test(unit)) return 'squareFoot'
    if (/^(cubic|cu)|³/.test(unit)) return 'cubicFoot'
    if (unit === 'mph' || /per hour/.test(unit)) return 'mph'
    if (/^(fluid|fl )/.test(unit)) return 'fluidOunce'
    if (/^(feet|foot|ft)$/.test(unit)) return 'foot'
    if (/^(mile|miles|mi)$/.test(unit)) return 'mile'
    if (/^(inch|inches|in)$/.test(unit)) return 'inch'
    if (/^(pound|pounds|lb|lbs)$/.test(unit)) return 'pound'
    if (/^(ounce|ounces|oz)$/.test(unit)) {
        if (/\b(weighs?|weight|mass)\b/i.test(context)) return 'ounce'
        if (liquidContext.test(context)) return 'fluidOunce'
        if (weightContext.test(context)) return 'ounce'
        return undefined
    }
    if (/^(pint|pints|pt)$/.test(unit)) return 'pint'
    if (/^(quart|quarts|qt)$/.test(unit)) return 'quart'
    if (/^(gallon|gallons|gal)$/.test(unit)) return 'gallon'
    return undefined
}

function quantity(text: string, unit: MeasurementUnit): Pick<Measurement, 'values' | 'separator'> {
    // Slash-separated weapon ranges are distinct from fractional quantities.
    const fraction = /^(\d+)\/(\d+)$/.exec(text.trim())
    if (fraction && Number(fraction[1]) < Number(fraction[2]) && [2, 3, 4, 8, 16].includes(Number(fraction[2]))) {
        return { values: [Number(fraction[1]) / Number(fraction[2])], separator: '' }
    }
    const mixed = /^\d+\s+\d+\/\d+$/.test(text.trim())
    if (mixed) return { values: [parseNumber(text)], separator: '' }
    const separator = text.includes('/') ? '/' : /[-–]|\bto\b/.test(text) ? '–' : ''
    const values = separator ? text.split(/\s*(?:\/|[-–]|to)\s*/).map(parseNumber) : [parseNumber(text)]
    return { values, separator: unit === 'foot' && separator === '/' ? '/' : separator }
}

export function tokenizeMeasurements(text: string, context = ''): MeasurementToken[] {
    const tokens: MeasurementToken[] = []
    let end = 0
    for (const match of text.matchAll(measurementPattern)) {
        if (match[2].toLowerCase() === 'in' && !/\b(length|width|height|thickness|diameter|wide|long|thick|tall|deep|across)\b/i.test(`${context} ${text}`)) continue
        const unit = identifyUnit(match[2], `${context} ${text.slice(Math.max(0, match.index - 45), match.index + match[0].length + 45)}`)
        if (!unit) continue
        const parsed = quantity(match[1], unit)
        if (parsed.values.some((value) => !Number.isFinite(value))) continue
        if (match.index > end) tokens.push(text.slice(end, match.index))
        tokens.push({ unit, ...parsed, perMinute: Boolean(match[3] || match[0].endsWith('/min')) })
        end = match.index + match[0].length
    }
    if (end < text.length) tokens.push(text.slice(end))
    return tokens
}

export function tableMeasurementUnit(header: string): MeasurementUnit | undefined {
    if (tokenizeMeasurements(header).some((token) => typeof token !== 'string')) return undefined
    const match = new RegExp(`(?:^|[\\s(])(${unitPattern})(?:$|[\\s)])`, 'i').exec(header)
    return match ? identifyUnit(match[1], header) : undefined
}

export function replaceTableUnit(header: string, label: string): string {
    return header.replace(new RegExp(`(^|[\\s(])(${unitPattern})(?=$|[\\s)])`, 'i'), `$1${label}`)
}

export function tableMeasurement(cell: string, header: string): Measurement | undefined {
    const unit = tableMeasurementUnit(header)
    if (!unit || !new RegExp(`^${quantityPattern}$`).test(cell.trim())) return undefined
    const parsed = quantity(cell, unit)
    return parsed.values.every(Number.isFinite) ? { unit, ...parsed } : undefined
}
