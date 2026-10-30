import { ALL_SOURCE_CODES } from '@/features/catalog'
import { isValidCatalogFilters, normalizeCatalogFilters } from './catalog-filter-schema'
import { DEFAULT_PROFILE_ID } from './defaults'
import type { ProfileState } from '../types'

export const BACKUP_VERSION = 1
export const MAX_BACKUP_FILE_SIZE = 1024 * 1024

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const SORT_KEYS = ['name', 'type', 'category', 'rarity', 'price']
const PAGE_SIZES = [10, 20, 50, 100]

function record(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && Object.keys(value).every((key) => keys.includes(key))
        && keys.every((key) => Object.hasOwn(value, key))
}

function stringList(value: unknown, allowed?: readonly string[]): value is string[] {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string' && (!allowed || allowed.includes(entry)))
}

function hasDangerousKeys(value: unknown): boolean {
    const pending: unknown[] = [value]
    while (pending.length > 0) {
        const current = pending.pop()
        if (current === null || typeof current !== 'object') continue
        if (Array.isArray(current)) {
            for (const entry of current) pending.push(entry)
            continue
        }
        for (const [key, entry] of Object.entries(current)) {
            if (DANGEROUS_KEYS.has(key)) return true
            pending.push(entry)
        }
    }
    return false
}

export function serializeSettingsBackup(state: ProfileState): string {
    return JSON.stringify({ version: BACKUP_VERSION, data: state }, null, 4)
}

export function parseSettingsBackup(json: string): ProfileState {
    let value: unknown
    try {
        value = JSON.parse(json) as unknown
    } catch {
        throw new Error('The selected file is not valid JSON.')
    }
    if (hasDangerousKeys(value)) throw new Error('The selected file contains unsafe keys.')
    if (!record(value, ['version', 'data']) || value.version !== BACKUP_VERSION) {
        throw new Error('The backup format or version is not supported.')
    }
    const data = value.data
    if (!record(data, ['profiles', 'activeProfileId']) || !Array.isArray(data.profiles)
        || typeof data.activeProfileId !== 'string' || data.profiles.length === 0) {
        throw new Error('The backup has an invalid profile structure.')
    }
    const ids = new Set<string>()
    for (const profile of data.profiles) {
        if (!record(profile, ['id', 'name', 'settings', 'catalog'])
            || typeof profile.id !== 'string' || !profile.id || ids.has(profile.id)
            || typeof profile.name !== 'string' || !profile.name.trim()) {
            throw new Error('The backup contains an invalid or duplicate profile.')
        }
        ids.add(profile.id)
        if (!record(profile.settings, ['selectedSources'])
            || !stringList(profile.settings.selectedSources, ALL_SOURCE_CODES)) {
            throw new Error('The backup contains invalid source settings.')
        }
        const catalog = profile.catalog
        if (!record(catalog, ['filters', 'sortKey', 'direction', 'pageSize'])
            || !SORT_KEYS.includes(catalog.sortKey as string)
            || !['asc', 'desc'].includes(catalog.direction as string)
            || !PAGE_SIZES.includes(catalog.pageSize as number)) {
            throw new Error('The backup contains invalid catalog preferences.')
        }
        const filters = catalog.filters
        if (!isValidCatalogFilters(filters)) {
            throw new Error('The backup contains invalid catalog filters.')
        }
    }
    if (!ids.has(DEFAULT_PROFILE_ID) || !ids.has(data.activeProfileId)) {
        throw new Error('The backup has no Default profile or a missing active profile.')
    }
    const state = data as unknown as ProfileState
    return {
        ...state,
        profiles: state.profiles.map((profile) => ({
            ...profile,
            catalog: { ...profile.catalog, filters: normalizeCatalogFilters(profile.catalog.filters) },
        })),
    }
}

export async function readSettingsBackup(file: File): Promise<ProfileState> {
    if (!file.name.toLowerCase().endsWith('.json') || (file.type && file.type !== 'application/json')) {
        throw new Error('Select a JSON file.')
    }
    if (file.size > MAX_BACKUP_FILE_SIZE) throw new Error('The JSON file is too large (maximum 1 MB).')
    return parseSettingsBackup(await file.text())
}
