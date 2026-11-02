import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n, { changeLanguage } from '@/app/i18n'
import { MeasurementText } from '@/features/measurements'
import { defaultMeasurements } from '@/features/measurements/model/preferences'
import { createSettingsStorage, PROFILES_RECORD_KEY, SETTINGS_DATABASE_NAME, SETTINGS_STORE_NAME } from '../api/settings-database'
import { SettingsProvider, useSettings } from './SettingsProvider'
import { createDefaultProfileState } from './defaults'
import { parseSettingsBackup, serializeSettingsBackup } from './settings-backup'
import { SettingsModal } from '../components/SettingsModal'

afterEach(async () => { await changeLanguage('en-US') })

function Preview() {
    const { createProfile, selectProfile, isSaving, isReady, resetLocalData } = useSettings()
    return <>
        <MeasurementText text="30 feet; 10 lb; 2 mph; 1 gallon" />
        <button disabled={!isReady || isSaving} onClick={() => void createProfile('Metric campaign')}>New profile</button>
        <button disabled={!isReady || isSaving} onClick={() => void selectProfile('default')}>Default profile</button>
        <button disabled={!isReady || isSaving} onClick={() => void resetLocalData()}>Reset preferences</button>
    </>
}

describe('profile measurement preferences', () => {
    it('persists language-based initialization of legacy profiles without following subsequent language changes', async () => {
        const factory = new IDBFactory()
        const storage = createSettingsStorage(factory)
        const original = await storage.loadProfiles!()
        const legacy = JSON.parse(JSON.stringify(original))
        delete legacy.profiles[0].settings.measurements
        const database = await new Promise<IDBDatabase>((resolve) => {
            const request = factory.open(SETTINGS_DATABASE_NAME)
            request.onsuccess = () => resolve(request.result)
        })
        await new Promise<void>((resolve) => {
            const transaction = database.transaction(SETTINGS_STORE_NAME, 'readwrite')
            transaction.objectStore(SETTINGS_STORE_NAME).put(legacy, PROFILES_RECORD_KEY)
            transaction.oncomplete = () => resolve()
        })
        database.close()
        await changeLanguage('pt-BR')
        expect((await storage.loadProfiles!()).profiles[0].settings.measurements).toEqual(defaultMeasurements('pt-BR'))
        await changeLanguage('en-US')
        expect((await storage.loadProfiles!()).profiles[0].settings.measurements).toEqual(defaultMeasurements('pt-BR'))
        await storage.close?.()
    })

    it('exports v2, migrates v1, and rejects invalid v2 preferences', async () => {
        await changeLanguage('pt-BR')
        const state = createDefaultProfileState()
        state.profiles[0].settings.measurements.weight = 'imperial'
        const backup = serializeSettingsBackup(state)
        expect(JSON.parse(backup).version).toBe(2)
        expect(parseSettingsBackup(backup)).toEqual(state)
        const legacy = JSON.parse(backup)
        legacy.version = 1
        delete legacy.data.profiles[0].settings.measurements
        expect(parseSettingsBackup(JSON.stringify(legacy)).profiles[0].settings.measurements).toEqual(defaultMeasurements('pt-BR'))
        const invalid = JSON.parse(backup)
        invalid.data.profiles[0].settings.measurements.distance = 'unknown'
        expect(() => parseSettingsBackup(JSON.stringify(invalid))).toThrow('invalid measurement settings')
        delete invalid.data.profiles[0].settings.measurements.distance
        expect(() => parseSettingsBackup(JSON.stringify(invalid))).toThrow('invalid measurement settings')
    })

    it('updates four independent controls, switches profiles, reloads, and resets using browser language', async () => {
        const storage = createSettingsStorage(new IDBFactory())
        const view = () => <SettingsProvider storage={storage}><SettingsModal onClose={vi.fn()} /><Preview /></SettingsProvider>
        const { unmount } = render(view())
        fireEvent.click(screen.getByRole('button', { name: 'Measurement Units' }))
        await waitFor(() => expect(screen.getByRole('combobox', { name: 'Distance' })).toBeEnabled())
        for (const label of ['Distance', 'Weight', 'Speed', 'Liquids']) {
            fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: 'metric' } })
            await waitFor(() => expect(screen.getByRole('combobox', { name: label })).toBeEnabled())
        }
        expect(screen.getByRole('button', { name: '9 m (6)' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '4.5 kg' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '3.2 km/h' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '3.8 L' })).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'New profile' }))
        await waitFor(() => expect(screen.getByRole('button', { name: '30 ft. (6)' })).toBeInTheDocument())
        await waitFor(() => expect(screen.getByRole('button', { name: 'Default profile' })).toBeEnabled())
        fireEvent.click(screen.getByRole('button', { name: 'Default profile' }))
        await waitFor(() => expect(screen.getByRole('button', { name: '9 m (6)' })).toBeInTheDocument())
        await waitFor(() => expect(screen.getByRole('button', { name: 'Default profile' })).toBeEnabled())
        unmount()
        await storage.close?.()
        render(view())
        await waitFor(() => expect(screen.getByRole('button', { name: '9 m (6)' })).toBeInTheDocument())
        await act(() => changeLanguage('pt-BR'))
        expect(screen.getByRole('button', { name: '9 m (6)' })).toBeInTheDocument()
        await waitFor(() => expect(screen.getByRole('button', { name: 'Reset preferences' })).toBeEnabled())
        fireEvent.click(screen.getByRole('button', { name: 'Reset preferences' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Reset preferences' })).toBeEnabled())
        await waitFor(() => expect(screen.getByRole('button', { name: '30 ft. (6)' })).toBeInTheDocument(), { timeout: 5000 })
        expect(i18n.language).toBe('en-US')
    })

    it('rolls back a failed save and reports the error', async () => {
        const storage = createSettingsStorage(new IDBFactory())
        await storage.loadProfiles!()
        storage.saveProfiles = vi.fn(async () => { throw new Error('Disk full') })
        render(<SettingsProvider storage={storage}><SettingsModal onClose={vi.fn()} /><Preview /></SettingsProvider>)
        fireEvent.click(screen.getByRole('button', { name: 'Measurement Units' }))
        const select = screen.getByRole('combobox', { name: 'Distance' })
        await waitFor(() => expect(select).toBeEnabled())
        fireEvent.change(select, { target: { value: 'metric' } })
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Disk full'))
        expect(select).toHaveValue('imperial')
        expect(screen.getByRole('button', { name: '30 ft. (6)' })).toBeInTheDocument()
    })
})
