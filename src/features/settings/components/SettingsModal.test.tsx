import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { ALL_SOURCE_CODES, formatSourceTitle, SOURCE_GROUPS, SOURCES_BY_EDITION } from '@/features/catalog'
import type { AppSettings, SettingsStorage } from '../types'
import { SettingsProvider } from '../model/SettingsProvider'
import { SettingsModal } from './SettingsModal'
import { createSettingsStorage } from '../api/settings-database'
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
        expect(screen.getByRole('region', { name: 'Local data' })).toBeInTheDocument()
        expect(screen.queryByRole('region', { name: 'Content sources' })).not.toBeInTheDocument()

        await user.click(contentSources)
        expect(contentSources).toHaveAttribute('aria-current', 'page')
        expect(dialog).toHaveStyle({ height: '100dvh' })
        expect(screen.getByRole('region', { name: 'Content sources' })).toBeInTheDocument()
        expect(screen.queryByRole('region', { name: 'Local data' })).not.toBeInTheDocument()

        await user.click(localData)
        expect(screen.getByRole('region', { name: 'Local data' })).toBeInTheDocument()
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
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
        expect(storage.reset).not.toHaveBeenCalled()

        await user.click(within(dialog).getByRole('button', { name: 'Reset local data' }))
        await user.click(within(dialog).getByRole('button', { name: 'Reset All Configuration' }))

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
        await user.click(screen.getByRole('button', { name: 'Reset All Configuration' }))

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('database blocked'))
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
