import { createDefaultCatalogPreferences, createDefaultProfileState, createDefaultSettings, DEFAULT_PROFILE_ID } from '../model/defaults'
import type { AppSettings, CatalogPreferences, Profile, ProfileState, SettingsStorage } from '../types'
import { ALL_SOURCE_CODES, normalizeSource } from '@/features/catalog'

export const SETTINGS_DATABASE_NAME = 'the-arcane-bazaar'
export const SETTINGS_DATABASE_VERSION = 1
export const SETTINGS_STORE_NAME = 'settings'
export const SETTINGS_RECORD_KEY = 'app-settings'
export const PROFILES_RECORD_KEY = 'profile-state'

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted'))
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
  })
}

function isStoredSettings(value: unknown): value is AppSettings {
  return typeof value === 'object'
    && value !== null
    && Array.isArray((value as Partial<AppSettings>).selectedSources)
    && (value as Partial<AppSettings>).selectedSources?.every((source) => typeof source === 'string') === true
}

function normalizeSettings(value: unknown): AppSettings {
  if (isStoredSettings(value)) {
    const selected = new Set(value.selectedSources.map(normalizeSource))
    return { selectedSources: ALL_SOURCE_CODES.filter((source) => selected.has(normalizeSource(source))) }
  }
  return createDefaultSettings()
}

function normalizeCatalog(value: unknown): CatalogPreferences {
  const defaults = createDefaultCatalogPreferences()
  if (typeof value !== 'object' || value === null) return defaults
  const stored = value as Partial<CatalogPreferences>
  const filters = stored.filters
  const validStrings = (input: unknown): input is string[] => Array.isArray(input) && input.every((entry) => typeof entry === 'string')
  const validSortKeys = ['name', 'type', 'category', 'rarity', 'price']
  return {
    filters: {
      search: typeof filters?.search === 'string' ? filters.search : '',
      types: validStrings(filters?.types) ? filters.types.filter((type): type is 'Common' | 'Magic' => type === 'Common' || type === 'Magic').slice(0, 1) : defaults.filters.types,
      rarities: validStrings(filters?.rarities) ? filters.rarities as CatalogPreferences['filters']['rarities'] : [],
      categories: validStrings(filters?.categories) ? filters.categories as CatalogPreferences['filters']['categories'] : [],
      availabilities: validStrings(filters?.availabilities) ? filters.availabilities as CatalogPreferences['filters']['availabilities'] : [],
      sources: validStrings(filters?.sources) ? filters.sources : [],
    },
    sortKey: validSortKeys.includes(stored.sortKey ?? '') ? stored.sortKey! : defaults.sortKey,
    direction: stored.direction === 'desc' ? 'desc' : 'asc',
    pageSize: [10, 20, 50, 100].includes(stored.pageSize ?? 0) ? stored.pageSize! : 20,
  }
}

function normalizeProfileState(value: unknown): ProfileState {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as Partial<ProfileState>).profiles)) return createDefaultProfileState()
  const stored = value as ProfileState
  const profiles: Profile[] = []
  const ids = new Set<string>()
  for (const candidate of stored.profiles) {
    if (!candidate || typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !candidate.id || ids.has(candidate.id)) continue
    ids.add(candidate.id)
    profiles.push({ id: candidate.id, name: candidate.id === DEFAULT_PROFILE_ID ? 'Default' : candidate.name.trim(), settings: normalizeSettings(candidate.settings), catalog: normalizeCatalog(candidate.catalog) })
  }
  if (!ids.has(DEFAULT_PROFILE_ID)) profiles.unshift(createDefaultProfileState().profiles[0])
  return { profiles, activeProfileId: profiles.some((profile) => profile.id === stored.activeProfileId) ? stored.activeProfileId : DEFAULT_PROFILE_ID }
}

function settingsMatch(left: AppSettings, right: AppSettings): boolean {
  return left.selectedSources.length === right.selectedSources.length
    && left.selectedSources.every((source, index) => source === right.selectedSources[index])
}

function browserIndexedDb(): IDBFactory {
  const factory = globalThis.indexedDB
  if (!factory) throw new Error('IndexedDB is not available in this browser')
  return factory
}

export function createSettingsStorage(factory?: IDBFactory): SettingsStorage {
  let databasePromise: Promise<IDBDatabase> | undefined

  const indexedDb = () => factory ?? browserIndexedDb()

  const openDatabase = (): Promise<IDBDatabase> => {
    if (databasePromise) return databasePromise

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDb().open(SETTINGS_DATABASE_NAME, SETTINGS_DATABASE_VERSION)
      let settled = false

      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(SETTINGS_STORE_NAME)) database.createObjectStore(SETTINGS_STORE_NAME)
      }
      request.onsuccess = () => {
        const database = request.result
        if (settled) {
          database.close()
          return
        }
        settled = true
        database.onversionchange = () => {
          database.close()
          databasePromise = undefined
        }
        resolve(database)
      }
      request.onerror = () => {
        if (settled) return
        settled = true
        reject(request.error ?? new Error('Could not open the settings database'))
      }
      request.onblocked = () => {
        if (settled) return
        settled = true
        reject(new Error('The settings database is blocked by another open tab'))
      }
    }).catch((error) => {
      databasePromise = undefined
      throw error
    })

    return databasePromise!
  }

  const load = async (): Promise<AppSettings> => {
    const database = await openDatabase()
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readonly')
    const completed = transactionComplete(transaction)
    const request = transaction.objectStore(SETTINGS_STORE_NAME).get(SETTINGS_RECORD_KEY)
    const storedValue = await requestResult(request)
    await completed
    const settings = normalizeSettings(storedValue)
    if (!isStoredSettings(storedValue) || !settingsMatch(storedValue, settings)) await save(settings)
    return settings
  }

  const save = async (settings: AppSettings): Promise<void> => {
    const database = await openDatabase()
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readwrite')
    const completed = transactionComplete(transaction)
    transaction.objectStore(SETTINGS_STORE_NAME).put(normalizeSettings(settings), SETTINGS_RECORD_KEY)
    await completed
  }

  const loadProfiles = async (): Promise<ProfileState> => {
    const database = await openDatabase()
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readwrite')
    const completed = transactionComplete(transaction)
    const store = transaction.objectStore(SETTINGS_STORE_NAME)
    const stored = await requestResult(store.get(PROFILES_RECORD_KEY))
    if (stored !== undefined) {
      const normalized = normalizeProfileState(stored)
      store.put(normalized, PROFILES_RECORD_KEY)
      await completed
      return normalized
    }
    const legacy = await requestResult(store.get(SETTINGS_RECORD_KEY))
    const initial = createDefaultProfileState(normalizeSettings(legacy))
    store.put(initial, PROFILES_RECORD_KEY)
    store.delete(SETTINGS_RECORD_KEY)
    await completed
    return initial
  }

  const saveProfiles = async (state: ProfileState): Promise<void> => {
    const database = await openDatabase()
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readwrite')
    const completed = transactionComplete(transaction)
    transaction.objectStore(SETTINGS_STORE_NAME).put(normalizeProfileState(state), PROFILES_RECORD_KEY)
    await completed
  }

  const closeDatabase = async (): Promise<void> => {
    if (!databasePromise) return
    try {
      const database = await databasePromise
      database.close()
    } finally {
      databasePromise = undefined
    }
  }

  const deleteDatabase = async (): Promise<void> => {
    await closeDatabase()
    await new Promise<void>((resolve, reject) => {
      const request = indexedDb().deleteDatabase(SETTINGS_DATABASE_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error('Could not delete the settings database'))
      request.onblocked = () => reject(new Error('Close other Arcane Bazaar tabs before resetting local data'))
    })
  }

  const reset = async (): Promise<AppSettings> => {
    await deleteDatabase()
    const defaults = createDefaultSettings()
    await save(defaults)
    return defaults
  }

  const resetProfiles = async (): Promise<ProfileState> => {
    await deleteDatabase()
    const defaults = createDefaultProfileState()
    await saveProfiles(defaults)
    return defaults
  }

  return { load, save, reset, loadProfiles, saveProfiles, resetProfiles, close: closeDatabase }
}
