import type { MeasurementPreferences } from '../types'

export const MEASUREMENT_CATEGORIES = ['distance', 'weight', 'speed', 'liquids'] as const

export function defaultMeasurements(language: string): MeasurementPreferences {
    const system = language.startsWith('pt') ? 'metric' : 'imperial'
    return { distance: system, weight: system, speed: system, liquids: system }
}

export function isMeasurementPreferences(value: unknown): value is MeasurementPreferences {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const record = value as Record<string, unknown>
    return Object.keys(record).length === 4 && MEASUREMENT_CATEGORIES.every((key) => record[key] === 'imperial' || record[key] === 'metric')
}
