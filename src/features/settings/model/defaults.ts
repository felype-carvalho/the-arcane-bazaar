import type { AppSettings } from '../types'
import { ALL_SOURCE_CODES } from '@/features/catalog/model/sources'

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  selectedSources: ALL_SOURCE_CODES,
})

export function createDefaultSettings(): AppSettings {
  return { selectedSources: [...DEFAULT_SETTINGS.selectedSources] }
}
