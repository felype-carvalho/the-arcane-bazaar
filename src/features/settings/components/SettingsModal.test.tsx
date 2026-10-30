import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { ALL_SOURCE_CODES, formatSourceTitle, SOURCE_GROUPS, SOURCES_BY_EDITION } from '@/features/catalog'
import type { AppSettings, SettingsStorage } from '../types'
import { SettingsProvider } from '../model/SettingsProvider'
import { SettingsModal } from './SettingsModal'
import { createSettingsStorage } from '../api/settings-database'
import { createDefaultProfileState } from '../model/defaults'
import { serializeSettingsBackup } from '../model/settings-backup'
import { IDBFactory } from 'fake-indexeddb'

function cloneSettings(settings: AppSettings): AppSettings {
    return { selectedSources: [...settings.selectedSources] }
}

function memoryStorage(initial: AppSettings = { selectedSources: [...ALL_SOURCE_CODES] }): SettingsStorage {
    let stored = cloneSettings(initial)
    return {
        load: vi.fn(async () => cloneSettings(stored)),
        save: vi.fn(async (settings) => { stored = cloneSettings(settings) }),
        reset: vi.fn(async () => {
            stored = { selectedSources: [...ALL_SOURCE_CODES] }
            return cloneSettings(stored)
        }),
    }
}

function renderModal(storage: SettingsStorage, openSources = true) {
    const view = render(
        <SettingsProvider storage={storage}>
            <SettingsModal onClose={vi.fn()} />
        </SettingsProvider>,
    )
    if (openSources) fireEvent.click(screen.getByRole('button', { name: 'Content Sources' }))
    return view
}

function dmgChip() {
    return screen.getByRole('button', { name: formatSourceTitle('DMG') })
}

describe('SettingsModal', () => {
    it('downloads a versioned JSON backup of the current state', async () => {
        const user = userEvent.setup()
        const storage = createSettingsStorage(new IDBFactory())
        const originalCreateUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
        const originalRevokeUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
        const createUrl = vi.fn((_blob: Blob) => 'blob:settings-backup')
        const revokeUrl = vi.fn()
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl })
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeUrl })
        let downloadedName = ''
        const clickLink = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloadedName = this.download })
        try {
            renderModal(storage, false)
            const button = screen.getByRole('button', { name: 'Backup Data' })
            await waitFor(() => expect(button).toBeEnabled(), { timeout: 5000 })
            await user.click(button)

            expect(clickLink).toHaveBeenCalledOnce()
            expect(createUrl).toHaveBeenCalledOnce()
            const blob = createUrl.mock.calls[0]?.[0]
            if (!blob) throw new Error('Backup blob was not created')
            expect(blob.type).toBe('application/json')
            const contents = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = () => reject(reader.error)
                reader.readAsText(blob)
            })
            expect(JSON.parse(contents)).toEqual({ version: 1, data: createDefaultProfileState() })
            expect(downloadedName).toMatch(/^arcane-bazaar-backup-\d{4}-\d{2}-\d{2}\.json$/)
        } finally {
            if (originalCreateUrl) Object.defineProperty(URL, 'createObjectURL', originalCreateUrl)
            else Reflect.deleteProperty(URL, 'createObjectURL')
            if (originalRevokeUrl) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeUrl)
            else Reflect.deleteProperty(URL, 'revokeObjectURL')
            clickLink.mockRestore()
            await storage.close?.()
        }
    }, 10000)

    it('warns before selecting a file and imports a validated backup', async () => {
        const user = userEvent.setup()
        const storage = createSettingsStorage(new IDBFactory())
        renderModal(storage, false)
        await waitFor(() => expect(screen.getByRole('button', { name: 'Import Data' })).toBeEnabled(), { timeout: 5000 })

        await user.click(screen.getByRole('button', { name: 'Import Data' }))
        const warning = screen.getByRole('dialog', { name: 'Import local data?' })
        expect(warning).toHaveTextContent('overwrite all current local data')
        expect(warning).toHaveTextContent('backing up your data')
        const continueButton = within(warning).getByRole('button', { name: 'Continue' })
        continueButton.focus()
        await user.tab()
        expect(within(warning).getByRole('button', { name: 'Close import local data?' })).toHaveFocus()
        await user.tab({ shift: true })
        expect(continueButton).toHaveFocus()
        await user.keyboard('{Escape}')
        expect(screen.queryByRole('dialog', { name: 'Import local data?' })).not.toBeInTheDocument()
        expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Import Data' })).toHaveFocus()

        const state = createDefaultProfileState()
        state.profiles.push({ ...state.profiles[0], id: 'campaign', name: 'Campaign', settings: { selectedSources: ['DMG'] }, catalog: { ...state.profiles[0].catalog, pageSize: 50 } })
        state.activeProfileId = 'campaign'
        const contents = serializeSettingsBackup(state)
        const file = new File([contents], 'backup.json', { type: 'application/json' })
        Object.defineProperty(file, 'text', { value: async () => contents })

        await user.click(screen.getByRole('button', { name: 'Import Data' }))
        await user.click(screen.getByRole('button', { name: 'Continue' }))
        fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Local data imported successfully.'))
        expect(await storage.loadProfiles!()).toEqual(state)
        await user.click(screen.getByRole('button', { name: 'Profile' }))
        expect(screen.getByRole('button', { name: 'Campaign (active)' })).toBeInTheDocument()
        await storage.close?.()
    }, 10000)

    it('keeps existing profiles after an invalid file or failed save', async () => {
        const user = userEvent.setup()
        const storage = createSettingsStorage(new IDBFactory())
        renderModal(storage, false)
        await waitFor(() => expect(screen.getByRole('button', { name: 'Import Data' })).toBeEnabled())
        const initial = await storage.loadProfiles!()
        const input = document.querySelector('input[type="file"]')!
        const invalidFile = new File(['<script>alert(1)</script>'], 'backup.json', { type: 'application/json' })
        Object.defineProperty(invalidFile, 'text', { value: async () => '<script>alert(1)</script>' })

        await user.click(screen.getByRole('button', { name: 'Import Data' }))
        await user.click(screen.getByRole('button', { name: 'Continue' }))
        fireEvent.change(input, { target: { files: [invalidFile] } })
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('not valid JSON'))
        expect(await storage.loadProfiles!()).toEqual(initial)

        const changed = { ...initial, profiles: [{ ...initial.profiles[0], settings: { selectedSources: ['DMG'] } }] }
        const contents = serializeSettingsBackup(changed)
        const validFile = new File([contents], 'backup.json', { type: 'application/json' })
        Object.defineProperty(validFile, 'text', { value: async () => contents })
        storage.saveProfiles = vi.fn(async () => { throw new Error('quota exceeded') })
        await user.click(screen.getByRole('button', { name: 'Import Data' }))
        await user.click(screen.getByRole('button', { name: 'Continue' }))
        fireEvent.change(input, { target: { files: [validFile] } })
        await waitFor(() => expect(screen.getAllByRole('alert').some((alert) => alert.textContent?.includes('quota exceeded'))).toBe(true))
        expect(await storage.loadProfiles!()).toEqual(initial)
        await storage.close?.()
    })

    it('creates, selects, renames, and deletes profiles while protecting Default', async () => {
        const user = userEvent.setup()
        const storage = createSettingsStorage(new IDBFactory())
        renderModal(storage)
        await user.click(screen.getByRole('button', { name: 'Profile' }))
        const defaultProfile = screen.getByRole('button', { name: 'Default (active)' })
        expect(defaultProfile).toBeDisabled()
        expect(defaultProfile.closest('li')).toHaveClass('bg-gold/25')
        expect(screen.queryByRole('button', { name: 'Rename Default' })).not.toBeInTheDocument()

        await user.type(screen.getByRole('textbox', { name: 'New profile name' }), 'Campaign')
        await user.click(screen.getByRole('button', { name: 'Create profile' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Campaign (active)' })).toBeInTheDocument())
        expect(screen.getByRole('button', { name: 'Campaign (active)' }).closest('li')).toHaveClass('bg-gold/25')
        expect(defaultProfile.closest('li')).not.toHaveClass('bg-gold/25')

        const renameButton = screen.getByRole('button', { name: 'Rename Campaign' })
        expect(renameButton).toHaveTextContent('')
        await user.click(renameButton)
        await user.clear(screen.getByRole('textbox', { name: 'Edit profile name' }))
        await user.type(screen.getByRole('textbox', { name: 'Edit profile name' }), 'Second campaign')
        const saveButton = screen.getByRole('button', { name: 'Save profile name' })
        expect(saveButton).toHaveTextContent('')
        await user.click(saveButton)
        await waitFor(() => expect(screen.getByRole('button', { name: 'Second campaign (active)' })).toBeInTheDocument())

        const deleteButton = screen.getByRole('button', { name: 'Delete Second campaign' })
        expect(deleteButton).toHaveTextContent('')
        await user.click(deleteButton)
        await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Default (active)' })).toBeInTheDocument())
        expect(screen.queryByText('Second campaign')).not.toBeInTheDocument()
        expect((await storage.loadProfiles!()).profiles).toHaveLength(1)
        await storage.close?.()
    }, 10000)
    it('navigates between settings sections', async () => {
        const user = userEvent.setup()
        renderModal(memoryStorage(), false)
        const navigation = screen.getByRole('navigation', { name: 'Settings sections' })
        const dialog = screen.getByRole('dialog', { name: 'Settings' })
        const localData = within(navigation).getByRole('button', { name: 'Local Data' })
        const contentSources = within(navigation).getByRole('button', { name: 'Content Sources' })

        expect(localData).toHaveAttribute('aria-current', 'page')
        expect(dialog).toHaveStyle({ height: '100dvh' })
        const localDataSection = screen.getByRole('region', { name: 'Import / Export Data' })
        expect(within(localDataSection).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Import / Export Data', 'Reset local data'])
        expect(screen.queryByRole('region', { name: 'Content sources' })).not.toBeInTheDocument()

        await user.click(contentSources)
        expect(contentSources).toHaveAttribute('aria-current', 'page')
        expect(dialog).toHaveStyle({ height: '100dvh' })
        expect(screen.getByRole('region', { name: 'Content sources' })).toBeInTheDocument()
        expect(screen.queryByRole('region', { name: 'Import / Export Data' })).not.toBeInTheDocument()

        await user.click(localData)
        expect(screen.getByRole('region', { name: 'Import / Export Data' })).toBeInTheDocument()
    })

    it('loads IndexedDB correctly under React StrictMode', async () => {
        render(
            <StrictMode>
                <SettingsProvider>
                    <SettingsModal onClose={vi.fn()} />
                </SettingsProvider>
            </StrictMode>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Content Sources' }))

        await waitFor(() => expect(dmgChip()).toBeEnabled(), { timeout: 5000 })
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('renders accessible source groups and persists an individual selection', async () => {
        const user = userEvent.setup()
        const storage = memoryStorage()
        renderModal(storage)

        const legacyGroup = screen.getByRole('group', { name: '5e' })
        const sourceChip = within(legacyGroup).getByRole('button', { name: formatSourceTitle('DMG') })
        await waitFor(() => expect(sourceChip).toBeEnabled())
        expect(sourceChip).toHaveAttribute('aria-pressed', 'true')

        await user.click(sourceChip)

        await waitFor(() => expect(storage.save).toHaveBeenCalledWith({
            selectedSources: ALL_SOURCE_CODES.filter((source) => source !== 'DMG'),
        }))
        expect(sourceChip).toHaveAttribute('aria-pressed', 'false')
    })

    it('separates each edition into ordered, accessible source subgroups', () => {
        renderModal(memoryStorage())
        const groupLabels = ['Core', 'Setting', 'Setting Alt', 'Supplement', 'Supplement Alt']

        for (const edition of ['5.5e', '5e'] as const) {
            const editionGroup = screen.getByRole('group', { name: edition })
            const subgroupHeadings = within(editionGroup).getAllByRole('heading', { level: 4 })
            expect(subgroupHeadings.map(({ textContent }) => textContent)).toEqual(groupLabels)

            for (const [index, group] of SOURCE_GROUPS.entries()) {
                const subgroup = within(editionGroup).getByRole('group', { name: groupLabels[index] })
                const source = SOURCES_BY_EDITION[edition].find((definition) => definition.group === group)
                expect(source).toBeDefined()
                expect(within(subgroup).getByRole('button', { name: formatSourceTitle(source!.source) })).toBeInTheDocument()
            }
        }
    })

    it('selects and clears a complete edition with one persisted update', async () => {
        const user = userEvent.setup()
        const storage = memoryStorage()
        renderModal(storage)
        const modernGroup = screen.getByRole('group', { name: '5.5e' })

        await waitFor(() => expect(within(modernGroup).getByRole('button', { name: 'Clear' })).toBeEnabled())
        await user.click(within(modernGroup).getByRole('button', { name: 'Clear' }))

        const modernSources = new Set(SOURCES_BY_EDITION['5.5e'].map(({ source }) => source))
        await waitFor(() => expect(storage.save).toHaveBeenCalledWith({
            selectedSources: ALL_SOURCE_CODES.filter((source) => !modernSources.has(source)),
        }))
        expect(within(modernGroup).getByText(`0/${SOURCES_BY_EDITION['5.5e'].length} selected`)).toBeInTheDocument()

        await user.click(within(modernGroup).getByRole('button', { name: 'Select all' }))
        await waitFor(() => expect(storage.save).toHaveBeenLastCalledWith({ selectedSources: [...ALL_SOURCE_CODES] }))
    })

    it('disables source controls while a setting is being persisted', async () => {
        const user = userEvent.setup()
        let finishSave: (() => void) | undefined
        const storage = memoryStorage()
        storage.save = vi.fn(() => new Promise<void>((resolve) => { finishSave = resolve }))
        renderModal(storage)

        const sourceChip = dmgChip()
        await waitFor(() => expect(sourceChip).toBeEnabled())
        await user.click(sourceChip)

        expect(sourceChip).toBeDisabled()
        expect(screen.getByRole('status')).toHaveTextContent('Saving local settings...')
        finishSave?.()
        await waitFor(() => expect(sourceChip).toBeEnabled())
    })

    it('rolls back a failed persisted change and reports the error', async () => {
        const user = userEvent.setup()
        const storage = memoryStorage()
        storage.save = vi.fn(async () => { throw new Error('quota exceeded') })
        renderModal(storage)

        const sourceChip = dmgChip()
        await waitFor(() => expect(sourceChip).toBeEnabled())
        await user.click(sourceChip)

        await waitFor(() => expect(sourceChip).toHaveAttribute('aria-pressed', 'true'))
        expect(screen.getByRole('alert')).toHaveTextContent('quota exceeded')
    })

    it('falls back to in-memory settings when IndexedDB cannot be loaded', async () => {
        const user = userEvent.setup()
        const storage = memoryStorage()
        storage.load = vi.fn(async () => { throw new Error('storage unavailable') })
        renderModal(storage)

        const sourceChip = dmgChip()
        await waitFor(() => expect(sourceChip).toBeEnabled())
        expect(screen.getByRole('alert')).toHaveTextContent('storage unavailable')

        await user.click(sourceChip)

        expect(sourceChip).toHaveAttribute('aria-pressed', 'false')
        expect(storage.save).not.toHaveBeenCalled()
        expect(screen.getByRole('alert')).toHaveTextContent('current session')
    })

    it('supports canceling and confirming a database reset', async () => {
        const user = userEvent.setup()
        const storage = memoryStorage({ selectedSources: ALL_SOURCE_CODES.filter((source) => source !== 'DMG') })
        renderModal(storage)
        const dialog = screen.getByRole('dialog', { name: 'Settings' })
        const sourceChip = within(dialog).getByRole('button', { name: formatSourceTitle('DMG') })
        await waitFor(() => expect(sourceChip).toBeEnabled())

        await user.click(within(dialog).getByRole('button', { name: 'Local Data' }))
        const resetButton = within(dialog).getByRole('button', { name: 'Reset local data' })
        expect(resetButton).toHaveClass('primary-button')
        await user.click(resetButton)
        const warning = screen.getByRole('dialog', { name: 'Reset local data?' })
        expect(warning).toHaveTextContent('Reset the IndexedDB database and all configuration?')
        await user.click(within(warning).getByRole('button', { name: 'Cancel' }))
        expect(screen.queryByRole('dialog', { name: 'Reset local data?' })).not.toBeInTheDocument()
        expect(storage.reset).not.toHaveBeenCalled()

        await user.click(within(dialog).getByRole('button', { name: 'Reset local data' }))
        await user.click(within(screen.getByRole('dialog', { name: 'Reset local data?' })).getByRole('button', { name: 'Continue' }))

        await waitFor(() => expect(storage.reset).toHaveBeenCalledOnce())
        await user.click(within(dialog).getByRole('button', { name: 'Content Sources' }))
        expect(sourceChip).toHaveAttribute('aria-pressed', 'true')
        expect(within(dialog).getByRole('status')).toHaveTextContent('Local data reset to defaults.')
    })

    it('keeps the current selections and reports a failed database reset', async () => {
        const user = userEvent.setup()
        const storage = memoryStorage({ selectedSources: ALL_SOURCE_CODES.filter((source) => source !== 'DMG') })
        storage.reset = vi.fn(async () => { throw new Error('database blocked') })
        renderModal(storage)
        const sourceChip = dmgChip()
        await waitFor(() => expect(sourceChip).toBeEnabled())

        await user.click(screen.getByRole('button', { name: 'Local Data' }))
        await user.click(screen.getByRole('button', { name: 'Reset local data' }))
        await user.click(within(screen.getByRole('dialog', { name: 'Reset local data?' })).getByRole('button', { name: 'Continue' }))

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('database blocked'))
        expect(screen.queryByRole('dialog', { name: 'Reset local data?' })).not.toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Content Sources' }))
        expect(sourceChip).toHaveAttribute('aria-pressed', 'false')
        expect(screen.queryByText('Local data reset to defaults.')).not.toBeInTheDocument()
    })

    it('includes source controls in keyboard navigation', async () => {
        const user = userEvent.setup()
        renderModal(memoryStorage())
        const closeButton = screen.getByRole('button', { name: 'Close settings' })
        const localData = screen.getByRole('button', { name: 'Local Data' })

        closeButton.focus()
        await user.tab()
        expect(localData).toHaveFocus()
    })
})
