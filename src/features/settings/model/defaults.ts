import i18n from '@/app/i18n'
import { defaultMeasurements } from '@/features/measurements/model/preferences'
import type { AppSettings, CatalogPreferences, ProfileState } from '../types'
import { ALL_SOURCE_CODES } from '@/features/catalog'
import { EMPTY_FILTERS } from '@/features/catalog/model/filtering'

export const DEFAULT_PROFILE_ID = 'default'

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
    selectedSources: ALL_SOURCE_CODES,
    measurements: defaultMeasurements(i18n.language),
})

export function createDefaultSettings(): AppSettings {
    return { selectedSources: [...DEFAULT_SETTINGS.selectedSources], measurements: defaultMeasurements(i18n.language) }
}

export function createDefaultCatalogPreferences(): CatalogPreferences {
    return {
        filters: { ...EMPTY_FILTERS, types: ['Common'], rarities: [], categories: [], availabilities: [], sources: [] },
        sortKey: 'name',
        direction: 'asc',
        pageSize: 20,
    }
}

export function createDefaultProfileState(settings = createDefaultSettings()): ProfileState {
    return {
        activeProfileId: DEFAULT_PROFILE_ID,
        profiles: [{ id: DEFAULT_PROFILE_ID, name: 'Default', settings, catalog: createDefaultCatalogPreferences() }],
    }
}
