import { Database, LibraryBig, Pencil, RotateCcw, Save, Settings, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { ModalDialog } from '@/components/ui/ModalDialog'
import {
    SourceChip,
    normalizeSource,
    SOURCE_GROUPS,
    SOURCES_BY_EDITION,
    type SourceEdition,
    type SourceGroup,
} from '@/features/catalog'
import { useSettings } from '../model/SettingsProvider'

interface SettingsModalProps {
    onClose: () => void
}

type SettingsSection = 'local-data' | 'profile' | 'content-sources'

const SOURCE_GROUP_LABELS: Readonly<Record<SourceGroup, string>> = {
    core: 'Core',
    setting: 'Setting',
    'setting-alt': 'Setting Alt',
    supplement: 'Supplement',
    'supplement-alt': 'Supplement Alt',
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { settings, profiles, activeProfileId, isReady, isSaving, error, setSourceEnabled, setSourcesEnabled, resetLocalData, createProfile, renameProfile, deleteProfile, selectProfile } = useSettings()
    const [confirmReset, setConfirmReset] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [activeSection, setActiveSection] = useState<SettingsSection>('local-data')
    const [profileName, setProfileName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [profileError, setProfileError] = useState('')
    const selectedSources = new Set(settings.selectedSources.map(normalizeSource))
    const sourceSelectionDisabled = !isReady || isSaving

    const updateSources = (sources: readonly string[], enabled: boolean) => {
        setSuccessMessage('')
        void setSourcesEnabled(sources, enabled)
    }

    const runProfileAction = async (action: () => Promise<void>) => {
        setProfileError('')
        setSuccessMessage('')
        try {
            await action()
        } catch (actionError) {
            setProfileError(actionError instanceof Error ? actionError.message : 'Profile action failed.')
        }
    }

    const renderSourceGroup = (edition: SourceEdition) => {
        const sources = SOURCES_BY_EDITION[edition]
        const sourceCodes = sources.map(({ source }) => source)
        const selectedCount = sourceCodes.filter((source) => selectedSources.has(normalizeSource(source))).length
        const titleId = `content-sources-${edition.replace('.', '-')}`
        const populatedGroups = SOURCE_GROUPS.map((group) => ({
            group,
            sources: sources.filter((source) => source.group === group),
        })).filter(({ sources: groupedSources }) => groupedSources.length > 0)

        return (
            <fieldset className="rounded-md border border-border bg-black/10 p-4">
                <legend id={titleId} className="px-1 font-display text-sm text-cream">{edition}</legend>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <span className="text-[10px] text-muted">{selectedCount}/{sources.length} selected</span>
                    <button
                        type="button"
                        className="text-[10px] text-gold hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={sourceSelectionDisabled || selectedCount === sources.length}
                        onClick={() => updateSources(sourceCodes, true)}
                    >
                        Select all
                    </button>
                    <button
                        type="button"
                        className="text-[10px] text-gold hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={sourceSelectionDisabled || selectedCount === 0}
                        onClick={() => updateSources(sourceCodes, false)}
                    >
                        Clear
                    </button>
                </div>
                <div className="mt-4 grid gap-4">
                    {populatedGroups.map(({ group, sources: groupedSources }) => {
                        const groupTitleId = `${titleId}-${group}`

                        return (
                            <div key={group} role="group" aria-labelledby={groupTitleId}>
                                <h4 id={groupTitleId} className="mb-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                                    {SOURCE_GROUP_LABELS[group]}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {groupedSources.map(({ source }) => {
                                        const selected = selectedSources.has(normalizeSource(source))
                                        return (
                                            <SourceChip
                                                key={source}
                                                source={source}
                                                selected={selected}
                                                disabled={sourceSelectionDisabled}
                                                onSelectedChange={(enabled) => {
                                                    setSuccessMessage('')
                                                    void setSourceEnabled(source, enabled)
                                                }}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </fieldset>
        )
    }

    const reset = async () => {
        setSuccessMessage('')
        try {
            await resetLocalData()
            setConfirmReset(false)
            setSuccessMessage('Local data reset to defaults.')
        } catch {
            // The provider exposes the actionable error message.
        }
    }

    return (
        <ModalDialog
            dialogHeight="100dvh"
            dialogWidth="min(1080px, 100%)"
            eyebrow="System"
            icon={<Settings size={20} />}
            onClose={onClose}
            title="Settings"
            titleId="settings-modal-title"
        >
            <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
                <nav aria-label="Settings sections" className="flex gap-2 border-b border-border pb-4 md:sticky md:top-0 md:flex-col md:self-start md:border-b-0 md:border-r md:pb-0 md:pr-4">
                    <button type="button" aria-current={activeSection === 'local-data' ? 'page' : undefined} aria-controls="local-data-section" onClick={() => setActiveSection('local-data')} className={`flex items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${activeSection === 'local-data' ? 'bg-gold/15 text-gold-bright' : 'text-muted hover:bg-white/5 hover:text-cream'}`}>
                        <Database size={15} aria-hidden="true" /> Local Data
                    </button>
                    <button type="button" aria-current={activeSection === 'profile' ? 'page' : undefined} aria-controls="profile-section" onClick={() => setActiveSection('profile')} className={`flex items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${activeSection === 'profile' ? 'bg-gold/15 text-gold-bright' : 'text-muted hover:bg-white/5 hover:text-cream'}`}>
                        <UserRound size={15} aria-hidden="true" /> Profile
                    </button>
                    <button type="button" aria-current={activeSection === 'content-sources' ? 'page' : undefined} aria-controls="content-sources-section" onClick={() => setActiveSection('content-sources')} className={`flex items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${activeSection === 'content-sources' ? 'bg-gold/15 text-gold-bright' : 'text-muted hover:bg-white/5 hover:text-cream'}`}>
                        <LibraryBig size={15} aria-hidden="true" /> Content Sources
                    </button>
                </nav>

                <div className="min-w-0">
                    <section id="content-sources-section" aria-labelledby="content-sources-title" hidden={activeSection !== 'content-sources'}>
                        <h3 id="content-sources-title" className="font-display text-xs uppercase tracking-[0.12em] text-gold">Content sources</h3>
                        <p className="mt-2 text-[11px] leading-5 text-muted">Choose which publications can contribute items and compatible variant bases to the catalog.</p>
                        <div className="mt-4 grid gap-4">
                            {renderSourceGroup('5.5e')}
                            {renderSourceGroup('5e')}
                        </div>
                    </section>

                    <section id="local-data-section" aria-labelledby="local-data-title" hidden={activeSection !== 'local-data'}>
                        <h3 id="local-data-title" className="font-display text-xs uppercase tracking-[0.12em] text-gold">Local data</h3>
                        <p className="mt-2 text-[11px] leading-5 text-muted">Delete this application's IndexedDB database and restore every setting to its default value.</p>

                        {!confirmReset ? (
                            <button className="primary-button mt-4" disabled={isSaving} onClick={() => { setSuccessMessage(''); setConfirmReset(true) }}>
                                <Trash2 size={14} /> Reset local data
                            </button>
                        ) : (
                            <div className="mt-4 rounded-md border border-red-900/70 bg-red-950/20 p-4">
                                <p className="text-xs leading-5 text-red-200">Reset the IndexedDB database and all configuration?</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button className="secondary-button" disabled={isSaving} onClick={() => setConfirmReset(false)}>Cancel</button>
                                    <button className="primary-button" disabled={isSaving} onClick={() => void reset()}><RotateCcw size={14} /> Reset All Configuration</button>
                                </div>
                            </div>
                        )}
                    </section>

                    <section id="profile-section" aria-labelledby="profile-title" hidden={activeSection !== 'profile'}>
                        <h3 id="profile-title" className="font-display text-xs uppercase tracking-[0.12em] text-gold">Profile</h3>
                        <p className="mt-2 text-[11px] leading-5 text-muted">Each profile keeps its own sources, filters, search, sorting, and items per page.</p>
                        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => {
                            event.preventDefault()
                            void runProfileAction(async () => { await createProfile(profileName); setProfileName('') })
                        }}>
                            <label className="sr-only" htmlFor="new-profile-name">New profile name</label>
                            <input id="new-profile-name" className="min-w-0 flex-1 rounded border border-border bg-panel px-3 py-2 text-xs text-cream" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Profile name" />
                            <button type="submit" className="primary-button !border-emerald-600 !bg-emerald-900 !bg-none !text-emerald-50 hover:!brightness-125" disabled={!isReady || isSaving}>Create profile</button>
                        </form>
                        <ul className="mt-4 grid gap-2">
                            {profiles.map((profile) => (
                                <li key={profile.id} className={`rounded-md border p-3 ${activeProfileId === profile.id ? 'border-gold/70 bg-gold/25' : 'border-border bg-black/10'}`}>
                                    {editingId === profile.id ? (
                                        <form className="flex flex-wrap gap-2" onSubmit={(event) => {
                                            event.preventDefault()
                                            void runProfileAction(async () => { await renameProfile(profile.id, editingName); setEditingId(null) })
                                        }}>
                                            <label className="sr-only" htmlFor={`edit-profile-${profile.id}`}>Edit profile name</label>
                                            <input id={`edit-profile-${profile.id}`} className="min-w-0 flex-1 rounded border border-border bg-panel px-3 py-2 text-xs text-cream" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                                            <button className="primary-button size-9 !min-h-0 !p-0" type="submit" aria-label="Save profile name" title="Save profile name" disabled={isSaving}><Save size={16} aria-hidden="true" /></button>
                                            <button className="secondary-button" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                                        </form>
                                    ) : (
                                        <div className="flex min-h-9 flex-wrap items-center gap-2">
                                            <button type="button" aria-current={activeProfileId === profile.id ? 'true' : undefined} className="min-w-0 flex-1 text-left text-sm text-cream hover:text-gold-bright" disabled={!isReady || isSaving || activeProfileId === profile.id} onClick={() => void runProfileAction(() => selectProfile(profile.id))}>{profile.name}{activeProfileId === profile.id ? ' (active)' : ''}</button>
                                            {profile.id !== 'default' && <>
                                                <button type="button" className="secondary-button size-9 !min-h-0 !border-orange-600 !bg-orange-900 !p-0 !text-orange-50 hover:!brightness-125" aria-label={`Rename ${profile.name}`} title={`Rename ${profile.name}`} disabled={isSaving} onClick={() => { setEditingId(profile.id); setEditingName(profile.name); setDeletingId(null) }}><Pencil size={16} aria-hidden="true" /></button>
                                                <button type="button" className="secondary-button size-9 !min-h-0 !border-red-600 !bg-red-900 !p-0 !text-red-50 hover:!brightness-125" aria-label={`Delete ${profile.name}`} title={`Delete ${profile.name}`} disabled={isSaving} onClick={() => { setDeletingId(profile.id); setEditingId(null) }}><Trash2 size={16} aria-hidden="true" /></button>
                                            </>}
                                        </div>
                                    )}
                                    {deletingId === profile.id && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-red-200">
                                        <span>Delete {profile.name}?</span>
                                        <button type="button" className="secondary-button" onClick={() => setDeletingId(null)}>Cancel</button>
                                        <button type="button" className="primary-button" disabled={isSaving} onClick={() => void runProfileAction(async () => { await deleteProfile(profile.id); setDeletingId(null) })}>Confirm delete</button>
                                    </div>}
                                </li>
                            ))}
                        </ul>
                        {profileError && <p role="alert" className="mt-4 text-xs text-red-300">{profileError}</p>}
                    </section>

                    {isSaving && <p role="status" className="mt-4 text-xs text-muted">Saving local settings...</p>}
                    {successMessage && <p role="status" className="mt-4 text-xs text-emerald-400">{successMessage}</p>}
                    {error && <p role="alert" className="mt-4 text-xs leading-5 text-red-300">{error}</p>}
                </div>
            </div>
        </ModalDialog>
    )
}
