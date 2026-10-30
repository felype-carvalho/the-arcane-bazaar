import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSettingsStorage } from '../api/settings-database'
import { createDefaultCatalogPreferences, createDefaultProfileState, createDefaultSettings, DEFAULT_PROFILE_ID } from './defaults'
import type { AppSettings, CatalogPreferences, ProfileState, SettingsContextValue, SettingsStorage } from '../types'
import { ALL_SOURCE_CODES, normalizeSource } from '@/features/catalog'

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
    const [state, setState] = useState<ProfileState>(createDefaultProfileState)
    const [isReady, setIsReady] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [resetVersion, setResetVersion] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const stateRef = useRef(state)
    const queueRef = useRef<Promise<void>>(Promise.resolve())
    const pendingRef = useRef(0)
    const revisionRef = useRef(0)
    const persistenceAvailableRef = useRef(true)
    const mountedRef = useRef(true)
    const lifecycleRef = useRef(0)
    const activeStorageRef = useRef(storage)

    const updateState = useCallback((next: ProfileState) => {
        stateRef.current = next
        setState(next)
    }, [])

    useEffect(() => {
        const lifecycle = ++lifecycleRef.current
        activeStorageRef.current = storage
        mountedRef.current = true
        let active = true
        setIsReady(false)
        setError(null)
        const load = storage.loadProfiles ? storage.loadProfiles() : storage.load().then((settings) => createDefaultProfileState(settings))
        load.then((loaded) => {
            if (!active) return
            persistenceAvailableRef.current = true
            updateState(loaded)
        }).catch((loadError) => {
            if (!active) return
            persistenceAvailableRef.current = false
            updateState(createDefaultProfileState())
            setError(errorMessage(loadError, 'Local settings could not be loaded. Changes will remain in memory'))
        }).finally(() => { if (active) setIsReady(true) })
        return () => {
            active = false
            mountedRef.current = false
            queueMicrotask(() => {
                if (activeStorageRef.current !== storage || lifecycleRef.current === lifecycle) void storage.close?.()
            })
        }
    }, [storage, updateState])

    const commit = useCallback((next: ProfileState, rollback = false, propagate = false): Promise<void> => {
        const previous = stateRef.current
        const revision = ++revisionRef.current
        updateState(next)
        setError(null)
        if (!persistenceAvailableRef.current) {
            setError('IndexedDB is unavailable. This change will last only for the current session.')
            return Promise.resolve()
        }
        pendingRef.current += 1
        setIsSaving(true)
        const operation = queueRef.current.then(async () => {
            if (storage.saveProfiles) await storage.saveProfiles(next)
            else await storage.save(next.profiles.find((profile) => profile.id === next.activeProfileId)?.settings ?? createDefaultSettings())
        })
        queueRef.current = operation.catch(() => undefined)
        return operation.catch((saveError) => {
            persistenceAvailableRef.current = false
            if (mountedRef.current) {
                if (rollback && revisionRef.current === revision) updateState(previous)
                setError(errorMessage(saveError, 'The setting could not be saved'))
            }
            if (propagate) throw saveError
        }).finally(() => {
            pendingRef.current -= 1
            if (mountedRef.current && pendingRef.current === 0) setIsSaving(false)
        })
    }, [storage, updateState])

    const updateActive = useCallback((change: (settings: AppSettings, catalog: CatalogPreferences) => { settings?: AppSettings; catalog?: CatalogPreferences }, rollback = false) => {
        const current = stateRef.current
        const next: ProfileState = {
            ...current,
            profiles: current.profiles.map((profile) => profile.id === current.activeProfileId ? { ...profile, ...change(profile.settings, profile.catalog) } : profile),
        }
        return commit(next, rollback)
    }, [commit])

    const setSourcesEnabled = useCallback((sources: readonly string[], enabled: boolean) => {
        if (pendingRef.current) return Promise.resolve()
        return updateActive((settings) => {
            const changed = new Set(sources.map(normalizeSource))
            const selected = new Set(settings.selectedSources.map(normalizeSource))
            for (const source of changed) {
                if (enabled) selected.add(source)
                else selected.delete(source)
            }
            return { settings: { selectedSources: ALL_SOURCE_CODES.filter((source) => selected.has(normalizeSource(source))) } }
        }, true)
    }, [updateActive])
    const setSourceEnabled = useCallback((source: string, enabled: boolean) => setSourcesEnabled([source], enabled), [setSourcesEnabled])
    const updateCatalog = useCallback((catalog: CatalogPreferences) => { void updateActive(() => ({ catalog })) }, [updateActive])

    const validateName = (name: string, excludeId?: string) => {
        const trimmed = name.trim()
        if (!trimmed) throw new Error('Enter a profile name.')
        if (stateRef.current.profiles.some((profile) => profile.id !== excludeId && profile.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) throw new Error('A profile with this name already exists.')
        return trimmed
    }
    const createProfile = useCallback(async (name: string) => {
        const validName = validateName(name)
        const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
        const current = stateRef.current
        await commit({ activeProfileId: id, profiles: [...current.profiles, { id, name: validName, settings: createDefaultSettings(), catalog: createDefaultCatalogPreferences() }] }, true, true)
    }, [commit])
    const renameProfile = useCallback(async (id: string, name: string) => {
        if (id === DEFAULT_PROFILE_ID) throw new Error('The Default profile cannot be renamed.')
        if (!stateRef.current.profiles.some((profile) => profile.id === id)) throw new Error('Profile not found.')
        const validName = validateName(name, id)
        const current = stateRef.current
        await commit({ ...current, profiles: current.profiles.map((profile) => profile.id === id ? { ...profile, name: validName } : profile) }, true, true)
    }, [commit])
    const deleteProfile = useCallback(async (id: string) => {
        if (id === DEFAULT_PROFILE_ID) throw new Error('The Default profile cannot be deleted.')
        const current = stateRef.current
        if (!current.profiles.some((profile) => profile.id === id)) throw new Error('Profile not found.')
        await commit({ activeProfileId: current.activeProfileId === id ? DEFAULT_PROFILE_ID : current.activeProfileId, profiles: current.profiles.filter((profile) => profile.id !== id) }, true, true)
    }, [commit])
    const selectProfile = useCallback(async (id: string) => {
        const current = stateRef.current
        if (!current.profiles.some((profile) => profile.id === id)) throw new Error('Profile not found.')
        if (current.activeProfileId !== id) await commit({ ...current, activeProfileId: id }, true, true)
    }, [commit])

    const resetLocalData = useCallback(async () => {
        await queueRef.current
        setIsSaving(true)
        setError(null)
        try {
            const defaults = storage.resetProfiles ? await storage.resetProfiles() : createDefaultProfileState(await storage.reset())
            persistenceAvailableRef.current = true
            updateState(defaults)
            setResetVersion((current) => current + 1)
        } catch (resetError) {
            persistenceAvailableRef.current = false
            setError(errorMessage(resetError, 'Local data could not be reset'))
            throw resetError
        } finally {
            if (mountedRef.current) setIsSaving(false)
        }
    }, [storage, updateState])

    const active = state.profiles.find((profile) => profile.id === state.activeProfileId) ?? state.profiles[0]
    const value = useMemo<SettingsContextValue>(() => ({
        settings: active.settings, catalog: active.catalog, profiles: state.profiles, activeProfileId: state.activeProfileId, resetVersion,
        isReady, isSaving, error, setSourceEnabled, setSourcesEnabled, resetLocalData,
        createProfile, renameProfile, deleteProfile, selectProfile, updateCatalog,
    }), [active, state, resetVersion, isReady, isSaving, error, setSourceEnabled, setSourcesEnabled, resetLocalData, createProfile, renameProfile, deleteProfile, selectProfile, updateCatalog])
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
    const context = useContext(SettingsContext)
    if (!context) throw new Error('useSettings must be used within SettingsProvider')
    return context
}
