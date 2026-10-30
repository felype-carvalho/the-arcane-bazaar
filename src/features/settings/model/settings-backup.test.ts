import { describe, expect, it } from 'vitest'
import { createDefaultProfileState } from './defaults'
import { MAX_BACKUP_FILE_SIZE, parseSettingsBackup, readSettingsBackup, serializeSettingsBackup } from './settings-backup'

describe('settings backup', () => {
    it('round trips all profiles and active catalog preferences', () => {
        const state = createDefaultProfileState()
        const campaign = {
            ...state.profiles[0],
            id: 'campaign',
            name: 'Campaign',
            settings: { selectedSources: ['DMG'] },
            catalog: { ...state.profiles[0].catalog, pageSize: 50, filters: { ...state.profiles[0].catalog.filters, search: 'sword' } },
        }
        state.profiles.push(campaign)
        state.activeProfileId = campaign.id

        expect(parseSettingsBackup(serializeSettingsBackup(state))).toEqual(state)
    })

    it('accepts catalog source codes emitted by the catalog and normalizes historical casing', () => {
        const state = createDefaultProfileState()
        state.profiles[0].catalog.filters.sources = ['JTTRC']
        expect(parseSettingsBackup(serializeSettingsBackup(state)).profiles[0].catalog.filters.sources).toEqual(['JTTRC'])

        state.profiles[0].catalog.filters.sources = ['JttRC']
        expect(parseSettingsBackup(serializeSettingsBackup(state)).profiles[0].catalog.filters.sources).toEqual(['JTTRC'])

        state.profiles[0].catalog.filters.sources = ['unknown']
        expect(() => parseSettingsBackup(serializeSettingsBackup(state))).toThrow('invalid catalog filters')
    })

    it('rejects malformed, incompatible, and unsafe backups', () => {
        const state = createDefaultProfileState()
        const valid = JSON.parse(serializeSettingsBackup(state)) as { version: number; data: typeof state }
        expect(() => parseSettingsBackup('<script>alert(1)</script>')).toThrow('not valid JSON')
        expect(() => parseSettingsBackup(JSON.stringify({ ...valid, version: 99 }))).toThrow('not supported')
        expect(() => parseSettingsBackup(serializeSettingsBackup({ ...state, activeProfileId: 'missing' }))).toThrow('missing active profile')
        expect(() => parseSettingsBackup(serializeSettingsBackup({ ...state, profiles: [...state.profiles, state.profiles[0]] }))).toThrow('duplicate profile')
        expect(() => parseSettingsBackup(serializeSettingsBackup({ ...state, profiles: [] }))).toThrow('invalid profile structure')
        expect(() => parseSettingsBackup(serializeSettingsBackup({ ...state, profiles: [{ ...state.profiles[0], catalog: { ...state.profiles[0].catalog, pageSize: -1 } }] }))).toThrow('invalid catalog preferences')
        expect(() => parseSettingsBackup(serializeSettingsBackup(state).replace('"search": ""', '"search": "", "__proto__": {"polluted": true}'))).toThrow('unsafe keys')
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    })

    it('accepts only JSON files within the size limit', async () => {
        const valid = serializeSettingsBackup(createDefaultProfileState())
        const makeFile = (name: string, type: string, contents: string) => {
            const file = new File([contents], name, { type })
            Object.defineProperty(file, 'text', { value: async () => contents })
            return file
        }
        await expect(readSettingsBackup(makeFile('backup.json', 'application/json', valid))).resolves.toEqual(createDefaultProfileState())
        await expect(readSettingsBackup(makeFile('payload.html', 'text/html', valid))).rejects.toThrow('Select a JSON file')
        await expect(readSettingsBackup(makeFile('backup.json', 'text/html', valid))).rejects.toThrow('Select a JSON file')
        await expect(readSettingsBackup(makeFile('large.json', 'application/json', ' '.repeat(MAX_BACKUP_FILE_SIZE + 1)))).rejects.toThrow('too large')
    })
})
