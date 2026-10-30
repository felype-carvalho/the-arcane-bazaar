import type { ItemFilters, SortDirection, SortKey } from '@/features/catalog/types'

export interface AppSettings {
  selectedSources: string[]
}

export interface CatalogPreferences {
  filters: ItemFilters
  sortKey: SortKey
  direction: SortDirection
  pageSize: number
}

export interface Profile {
  id: string
  name: string
  settings: AppSettings
  catalog: CatalogPreferences
}

export interface ProfileState {
  profiles: Profile[]
  activeProfileId: string
}

export interface SettingsStorage {
  load: () => Promise<AppSettings>
  save: (settings: AppSettings) => Promise<void>
  reset: () => Promise<AppSettings>
  close?: () => Promise<void> | void
  loadProfiles?: () => Promise<ProfileState>
  saveProfiles?: (state: ProfileState) => Promise<void>
  resetProfiles?: () => Promise<ProfileState>
}

export interface SettingsContextValue {
  settings: AppSettings
  catalog: CatalogPreferences
  profiles: readonly Profile[]
  activeProfileId: string
  resetVersion: number
  isReady: boolean
  isSaving: boolean
  error: string | null
  setSourceEnabled: (source: string, enabled: boolean) => Promise<void>
  setSourcesEnabled: (sources: readonly string[], enabled: boolean) => Promise<void>
  resetLocalData: () => Promise<void>
  createProfile: (name: string) => Promise<void>
  renameProfile: (id: string, name: string) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  selectProfile: (id: string) => Promise<void>
  updateCatalog: (catalog: CatalogPreferences) => void
}
