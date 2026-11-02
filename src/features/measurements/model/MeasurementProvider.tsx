import { createContext, useContext, type ReactNode } from 'react'
import type { MeasurementPreferences } from '../types'
import { defaultMeasurements } from './preferences'

const MeasurementContext = createContext<MeasurementPreferences>(defaultMeasurements('en-US'))

export function MeasurementProvider({ preferences, children }: { preferences: MeasurementPreferences; children: ReactNode }) {
    return <MeasurementContext.Provider value={preferences}>{children}</MeasurementContext.Provider>
}

export function useMeasurements(): MeasurementPreferences {
    return useContext(MeasurementContext)
}
