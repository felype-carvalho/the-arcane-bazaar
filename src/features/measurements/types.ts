export type MeasurementSystem = 'imperial' | 'metric'
export type MeasurementCategory = 'distance' | 'weight' | 'speed' | 'liquids'
export type MeasurementPreferences = Record<MeasurementCategory, MeasurementSystem>
export type MeasurementUnit = 'foot' | 'mile' | 'inch' | 'pound' | 'ounce' | 'mph' | 'squareFoot' | 'cubicFoot' | 'fluidOunce' | 'pint' | 'quart' | 'gallon'

export interface Measurement {
    unit: MeasurementUnit
    values: number[]
    separator: string
    perMinute?: boolean
}

export type MeasurementToken = string | Measurement
