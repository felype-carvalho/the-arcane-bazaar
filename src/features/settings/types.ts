export interface AppSettings {
  selectedSources: string[]
}

export interface SettingsStorage {
  load: () => Promise<AppSettings>
  save: (settings: AppSettings) => Promise<void>
  reset: () => Promise<AppSettings>
  close?: () => Promise<void> | void
}

export interface SettingsContextValue {
  settings: AppSettings
  isReady: boolean
  isSaving: boolean
  error: string | null
  setSourceEnabled: (source: string, enabled: boolean) => Promise<void>
  setSourcesEnabled: (sources: readonly string[], enabled: boolean) => Promise<void>
  resetLocalData: () => Promise<void>
}
