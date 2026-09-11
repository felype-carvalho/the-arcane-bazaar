import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSettingsStorage } from '../api/settings-database'
import { createDefaultSettings } from './defaults'
import type { AppSettings, SettingsContextValue, SettingsStorage } from '../types'
import { ALL_SOURCE_CODES, normalizeSource } from '@/features/catalog/model/sources'

const SettingsContext = createContext<SettingsContextValue | null>(null)

interface SettingsProviderProps {
  children: ReactNode
  storage?: SettingsStorage
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback
}

export function SettingsProvider({ children, storage: providedStorage }: SettingsProviderProps) {
  const defaultStorageRef = useRef<SettingsStorage | null>(null)
  if (!defaultStorageRef.current) defaultStorageRef.current = createSettingsStorage()
  const storage = providedStorage ?? defaultStorageRef.current
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings)
  const [isReady, setIsReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const settingsRef = useRef(settings)
  const savingRef = useRef(false)
  const persistenceAvailableRef = useRef(true)
  const mountedRef = useRef(true)
  const lifecycleRef = useRef(0)
  const activeStorageRef = useRef(storage)

  const updateSettings = useCallback((next: AppSettings) => {
    settingsRef.current = next
    setSettings(next)
  }, [])

  useEffect(() => {
    const lifecycle = ++lifecycleRef.current
    activeStorageRef.current = storage
    mountedRef.current = true
    let active = true
    setIsReady(false)
    setError(null)

    storage.load()
      .then((storedSettings) => {
        if (!active) return
        persistenceAvailableRef.current = true
        updateSettings(storedSettings)
      })
      .catch((loadError) => {
        if (!active) return
        persistenceAvailableRef.current = false
        updateSettings(createDefaultSettings())
        setError(errorMessage(loadError, 'Local settings could not be loaded. Changes will remain in memory'))
      })
      .finally(() => { if (active) setIsReady(true) })

    return () => {
      active = false
      mountedRef.current = false
      queueMicrotask(() => {
        const storageChanged = activeStorageRef.current !== storage
        const providerStayedUnmounted = lifecycleRef.current === lifecycle
        if (storageChanged || providerStayedUnmounted) void storage.close?.()
      })
    }
  }, [storage, updateSettings])

  const setSourcesEnabled = useCallback(async (sources: readonly string[], enabled: boolean) => {
    if (savingRef.current) return

    const previous = settingsRef.current
    const changedSources = new Set(sources.map(normalizeSource))
    const previouslySelected = new Set(previous.selectedSources.map(normalizeSource))
    for (const source of changedSources) {
      if (enabled) previouslySelected.add(source)
      else previouslySelected.delete(source)
    }
    const next = {
      selectedSources: ALL_SOURCE_CODES.filter((source) => previouslySelected.has(normalizeSource(source))),
    }
    if (next.selectedSources.length === previous.selectedSources.length
      && next.selectedSources.every((source, index) => source === previous.selectedSources[index])) return
    updateSettings(next)
    setError(null)

    if (!persistenceAvailableRef.current) {
      setError('IndexedDB is unavailable. This change will last only for the current session.')
      return
    }

    savingRef.current = true
    setIsSaving(true)
    try {
      await storage.save(next)
    } catch (saveError) {
      persistenceAvailableRef.current = false
      if (mountedRef.current) {
        updateSettings(previous)
        setError(errorMessage(saveError, 'The setting could not be saved'))
      }
    } finally {
      savingRef.current = false
      if (mountedRef.current) setIsSaving(false)
    }
  }, [storage, updateSettings])

  const setSourceEnabled = useCallback((source: string, enabled: boolean) => (
    setSourcesEnabled([source], enabled)
  ), [setSourcesEnabled])

  const resetLocalData = useCallback(async () => {
    if (savingRef.current) return

    savingRef.current = true
    setIsSaving(true)
    setError(null)
    try {
      const defaults = await storage.reset()
      persistenceAvailableRef.current = true
      if (mountedRef.current) updateSettings(defaults)
    } catch (resetError) {
      persistenceAvailableRef.current = false
      if (mountedRef.current) setError(errorMessage(resetError, 'Local data could not be reset'))
      throw resetError
    } finally {
      savingRef.current = false
      if (mountedRef.current) setIsSaving(false)
    }
  }, [storage, updateSettings])

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    isReady,
    isSaving,
    error,
    setSourceEnabled,
    setSourcesEnabled,
    resetLocalData,
  }), [error, isReady, isSaving, resetLocalData, setSourceEnabled, setSourcesEnabled, settings])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}
