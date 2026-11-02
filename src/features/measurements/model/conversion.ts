import type { Measurement, MeasurementCategory, MeasurementSystem, MeasurementUnit } from '../types'

const units: Record<MeasurementUnit, { category: MeasurementCategory; factor: number; metric: string; en: string; pt: string }> = {
    foot: { category: 'distance', factor: 0.3, metric: 'm', en: 'ft.', pt: 'pés' },
    mile: { category: 'distance', factor: 1.609344, metric: 'km', en: 'mi', pt: 'milhas' },
    inch: { category: 'distance', factor: 2.54, metric: 'cm', en: 'in', pt: 'pol.' },
    pound: { category: 'weight', factor: 0.45359237, metric: 'kg', en: 'lb', pt: 'lb' },
    ounce: { category: 'weight', factor: 0.028349523125, metric: 'kg', en: 'oz', pt: 'oz' },
    mph: { category: 'speed', factor: 1.609344, metric: 'km/h', en: 'mph', pt: 'mph' },
    squareFoot: { category: 'distance', factor: 0.09, metric: 'm²', en: 'ft²', pt: 'pés²' },
    cubicFoot: { category: 'distance', factor: 0.027, metric: 'm³', en: 'ft³', pt: 'pés³' },
    fluidOunce: { category: 'liquids', factor: 3.785411784 / 128, metric: 'L', en: 'fl oz', pt: 'onças fluidas' },
    pint: { category: 'liquids', factor: 3.785411784 / 8, metric: 'L', en: 'pt', pt: 'pintas' },
    quart: { category: 'liquids', factor: 3.785411784 / 4, metric: 'L', en: 'qt', pt: 'quartos' },
    gallon: { category: 'liquids', factor: 3.785411784, metric: 'L', en: 'gal', pt: 'galões' },
}

export function measurementCategory(unit: MeasurementUnit): MeasurementCategory {
    return units[unit].category
}

export function measurementUnitLabel(unit: MeasurementUnit, system: MeasurementSystem, language: string): string {
    const definition = units[unit]
    return system === 'metric' ? definition.category === 'liquids' ? 'L / ml' : definition.metric : language.startsWith('pt') ? definition.pt : definition.en
}

export function formatMeasurementNumber(value: number, language: string): string {
    const digits = value !== 0 && Math.abs(value) < 0.05 ? Math.min(15, Math.ceil(-Math.log10(Math.abs(value))) + 1) : 1
    return new Intl.NumberFormat(language, { maximumFractionDigits: digits }).format(value)
}

export function formatMeasurement(measurement: Measurement, system: MeasurementSystem, language: string): string {
    const definition = units[measurement.unit]
    const values = measurement.values.map((value) => value * (system === 'metric' ? definition.factor : 1))
    const milliliters = system === 'metric' && definition.category === 'liquids' && Math.max(...values) < 1
    let unit = system === 'metric' ? (milliliters ? 'ml' : definition.metric) : language.startsWith('pt') ? definition.pt : definition.en
    if (system === 'imperial' && language.startsWith('pt') && values.length === 1 && values[0] === 1) {
        unit = ({ foot: 'pé', mile: 'milha', fluidOunce: 'onça fluida', pint: 'pinta', quart: 'quarto', gallon: 'galão' } as Partial<Record<MeasurementUnit, string>>)[measurement.unit] ?? unit
    }
    const display = values.map((value) => formatMeasurementNumber(value * (milliliters ? 1000 : 1), language)).join(measurement.separator)
    const squares = measurement.unit === 'foot' ? ` (${measurement.values.map((value) => formatMeasurementNumber(value / 5, language)).join(measurement.separator)})` : ''
    return `${display} ${unit}${measurement.perMinute ? '/min' : ''}${squares}`
}
