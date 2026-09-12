import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { ALL_SOURCE_CODES } from '@/features/catalog/model/sources'
import { createSettingsStorage, SETTINGS_DATABASE_NAME, SETTINGS_DATABASE_VERSION, SETTINGS_RECORD_KEY, SETTINGS_STORE_NAME } from './settings-database'

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(SETTINGS_DATABASE_NAME, SETTINGS_DATABASE_VERSION)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readStoredSettings(factory: IDBFactory): Promise<unknown> {
  const database = await openDatabase(factory)
  const transaction = database.transaction(SETTINGS_STORE_NAME, 'readonly')
  const request = transaction.objectStore(SETTINGS_STORE_NAME).get(SETTINGS_RECORD_KEY)
  const result = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return result
}

describe('settings IndexedDB storage', () => {
  it('creates the database and selects every source when no record exists', async () => {
    const factory = new IDBFactory()
    const storage = createSettingsStorage(factory)

    await expect(storage.load()).resolves.toEqual({ selectedSources: ALL_SOURCE_CODES })
    expect(await readStoredSettings(factory)).toEqual({ selectedSources: ALL_SOURCE_CODES })
    await storage.close?.()
  })

  it('persists normalized settings for a later connection', async () => {
    const factory = new IDBFactory()
    const firstStorage = createSettingsStorage(factory)
    await firstStorage.save({ selectedSources: ['xdmg', 'DMG', 'unknown', 'DMG'] })
    await firstStorage.close?.()

    const secondStorage = createSettingsStorage(factory)
    await expect(secondStorage.load()).resolves.toEqual({ selectedSources: ['DMG', 'XDMG'] })
    await secondStorage.close?.()
  })

  it('discards excluded sources from an existing stored selection', async () => {
    const factory = new IDBFactory()
    const storage = createSettingsStorage(factory)
    await storage.load()
    await storage.close?.()

    const database = await openDatabase(factory)
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readwrite')
    transaction.objectStore(SETTINGS_STORE_NAME).put({ selectedSources: ['DMG', 'HF', 'CaBoMP'] }, SETTINGS_RECORD_KEY)
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()

    const reloadedStorage = createSettingsStorage(factory)
    await expect(reloadedStorage.load()).resolves.toEqual({ selectedSources: ['DMG'] })
    await reloadedStorage.close?.()
    expect(await readStoredSettings(factory)).toEqual({ selectedSources: ['DMG'] })
  })

  it('discards and rewrites a legacy stored record with the new defaults', async () => {
    const factory = new IDBFactory()
    const storage = createSettingsStorage(factory)
    await storage.load()
    await storage.close?.()

    const database = await openDatabase(factory)
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readwrite')
    transaction.objectStore(SETTINGS_STORE_NAME).put({ legacyContentEnabled: false }, SETTINGS_RECORD_KEY)
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()

    const reloadedStorage = createSettingsStorage(factory)
    await expect(reloadedStorage.load()).resolves.toEqual({ selectedSources: ALL_SOURCE_CODES })
    await reloadedStorage.close?.()
    expect(await readStoredSettings(factory)).toEqual({ selectedSources: ALL_SOURCE_CODES })
  })

  it('falls back to defaults for an invalid stored record', async () => {
    const factory = new IDBFactory()
    const storage = createSettingsStorage(factory)
    await storage.save({ selectedSources: ['DMG'] })
    await storage.close?.()

    const database = await openDatabase(factory)
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readwrite')
    transaction.objectStore(SETTINGS_STORE_NAME).put({ selectedSources: [false] }, SETTINGS_RECORD_KEY)
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()

    const reloadedStorage = createSettingsStorage(factory)
    await expect(reloadedStorage.load()).resolves.toEqual({ selectedSources: ALL_SOURCE_CODES })
    await reloadedStorage.close?.()
  })

  it('deletes, recreates, and resets the application database', async () => {
    const factory = new IDBFactory()
    const storage = createSettingsStorage(factory)
    await storage.save({ selectedSources: ['XDMG'] })

    await expect(storage.reset()).resolves.toEqual({ selectedSources: ALL_SOURCE_CODES })
    await expect(storage.load()).resolves.toEqual({ selectedSources: ALL_SOURCE_CODES })
    await storage.close?.()
  })
})
