import { useInterfaceTranslation } from '@/app/i18n'
import { Database, Download, LibraryBig, Pencil, Save, Settings, Trash2, Upload, UserRound } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { AlertDialog } from '@/components/ui/AlertDialog'
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
import { readSettingsBackup } from '../model/settings-backup'

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
    const { t, label, message } = useInterfaceTranslation()
    const { settings, profiles, activeProfileId, isReady, isSaving, error, setSourceEnabled, setSourcesEnabled, resetLocalData, exportSettingsBackup, importSettingsBackup, createProfile, renameProfile, deleteProfile, selectProfile } = useSettings()
    const [showResetAlert, setShowResetAlert] = useState(false)
    const [showImportAlert, setShowImportAlert] = useState(false)
    const [importError, setImportError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
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
                    <span className="text-[10px] text-muted">{selectedCount}/{sources.length} {t("settings.selectedSources")}</span>
                    <button
                        type="button"
                        className="text-[10px] text-gold hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={sourceSelectionDisabled || selectedCount === sources.length}
                        onClick={() => updateSources(sourceCodes, true)}
                    >
                        {t("common.selectAll")}</button>
                    <button
                        type="button"
                        className="text-[10px] text-gold hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={sourceSelectionDisabled || selectedCount === 0}
                        onClick={() => updateSources(sourceCodes, false)}
                    >
                        {t("common.clear")}</button>
                </div>
                <div className="mt-4 grid gap-4">
                    {populatedGroups.map(({ group, sources: groupedSources }) => {
                        const groupTitleId = `${titleId}-${group}`

                        return (
                            <div key={group} role="group" aria-labelledby={groupTitleId}>
                                <h4 id={groupTitleId} className="mb-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                                    {label(SOURCE_GROUP_LABELS[group])}
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
        setShowResetAlert(false)
        setSuccessMessage('')
        try {
            await resetLocalData()
            setSuccessMessage('Local data reset to defaults.')
        } catch {
            // The provider exposes the actionable error message.
        }
    }

    const downloadBackup = () => {
        const file = new Blob([exportSettingsBackup()], { type: 'application/json' })
        const url = URL.createObjectURL(file)
        const link = document.createElement('a')
        link.href = url
        link.download = `arcane-bazaar-backup-${new Date().toISOString().slice(0, 10)}.json`
        document.body.append(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 0)
    }

    const selectImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setImportError('')
        setSuccessMessage('')
        try {
            const imported = await readSettingsBackup(file)
            await importSettingsBackup(imported)
            setSuccessMessage('Local data imported successfully.')
        } catch (importFailure) {
            setImportError(importFailure instanceof Error ? importFailure.message : 'Local data could not be imported.')
        }
    }

    return (
        <ModalDialog
            dialogHeight="100dvh"
            dialogWidth="min(1080px, 100%)"
            eyebrow={t("common.system")}
            icon={<Settings size={20} />}
            inactive={showResetAlert || showImportAlert}
            onClose={onClose}
            title={t("toolbar.settings")}
            titleId="settings-modal-title"
        >
            <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
                <nav aria-label={t("settings.sections")} className="flex gap-2 border-b border-border pb-4 md:sticky md:top-0 md:flex-col md:self-start md:border-b-0 md:border-r md:pb-0 md:pr-4">
                    <button type="button" aria-current={activeSection === 'local-data' ? 'page' : undefined} aria-controls="local-data-section" onClick={() => setActiveSection('local-data')} className={`flex items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${activeSection === 'local-data' ? 'bg-gold/15 text-gold-bright' : 'text-muted hover:bg-white/5 hover:text-cream'}`}>
                        <Database size={15} aria-hidden="true" /> {t("settings.localData")}</button>
                    <button type="button" aria-current={activeSection === 'profile' ? 'page' : undefined} aria-controls="profile-section" onClick={() => setActiveSection('profile')} className={`flex items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${activeSection === 'profile' ? 'bg-gold/15 text-gold-bright' : 'text-muted hover:bg-white/5 hover:text-cream'}`}>
                        <UserRound size={15} aria-hidden="true" /> {t("settings.profile")}</button>
                    <button type="button" aria-current={activeSection === 'content-sources' ? 'page' : undefined} aria-controls="content-sources-section" onClick={() => setActiveSection('content-sources')} className={`flex items-center gap-2 rounded px-3 py-2 text-left text-xs transition-colors ${activeSection === 'content-sources' ? 'bg-gold/15 text-gold-bright' : 'text-muted hover:bg-white/5 hover:text-cream'}`}>
                        <LibraryBig size={15} aria-hidden="true" /> {t("settings.contentSources")}</button>
                </nav>

                <div className="min-w-0">
                    <section id="content-sources-section" aria-labelledby="content-sources-title" hidden={activeSection !== 'content-sources'}>
                        <h3 id="content-sources-title" className="font-display text-xs uppercase tracking-[0.12em] text-gold">{t("settings.contentSourcesTitle")}</h3>
                        <p className="mt-2 text-[11px] leading-5 text-muted">{t("settings.contentSourcesHint")}</p>
                        <div className="mt-4 grid gap-4">
                            {renderSourceGroup('5.5e')}
                            {renderSourceGroup('5e')}
                        </div>
                    </section>

                    <section id="local-data-section" aria-labelledby="local-data-title" hidden={activeSection !== 'local-data'}>
                        <h3 id="local-data-title" className="font-display text-xs uppercase tracking-[0.12em] text-gold">{t("settings.backupTitle")}</h3>
                        <p className="mt-2 text-[11px] leading-5 text-muted">{t("settings.backupHint")}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" className="secondary-button !border-emerald-600 !bg-emerald-900 !text-[#fff2ce] shadow-[0_5px_16px_rgba(80,8,25,0.25)] hover:!brightness-[1.14]" disabled={!isReady || isSaving} onClick={downloadBackup}><Upload size={14} /> {t("settings.exportData")}</button>
                            <button type="button" className="secondary-button !border-blue-600 !bg-blue-900 !text-[#fff2ce] shadow-[0_5px_16px_rgba(80,8,25,0.25)] hover:!brightness-[1.14]" disabled={!isReady || isSaving} onClick={() => { setImportError(''); setSuccessMessage(''); setShowImportAlert(true) }}><Download size={14} /> {t("settings.importData")}</button>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={(event) => void selectImportFile(event)} />
                        {importError && <p role="alert" className="mt-4 text-xs leading-5 text-red-300">{message(importError)}</p>}
                        <div className="mt-8 border-t border-border pt-6">
                            <h3 className="font-display text-xs uppercase tracking-[0.12em] text-gold">{t("settings.resetData")}</h3>
                            <p className="mt-2 text-[11px] leading-5 text-muted">{t("settings.resetHint")}</p>
                            <button className="primary-button mt-4" disabled={isSaving} onClick={() => { setSuccessMessage(''); setShowResetAlert(true) }}>
                                <Trash2 size={14} /> {t("settings.resetData")}</button>
                        </div>
                    </section>

                    <section id="profile-section" aria-labelledby="profile-title" hidden={activeSection !== 'profile'}>
                        <h3 id="profile-title" className="font-display text-xs uppercase tracking-[0.12em] text-gold">{t("settings.profile")}</h3>
                        <p className="mt-2 text-[11px] leading-5 text-muted">{t("settings.profileHint")}</p>
                        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => {
                            event.preventDefault()
                            void runProfileAction(async () => { await createProfile(profileName); setProfileName('') })
                        }}>
                            <label className="sr-only" htmlFor="new-profile-name">{t("settings.newProfileName")}</label>
                            <input id="new-profile-name" className="min-w-0 flex-1 rounded border border-border bg-panel px-3 py-2 text-xs text-cream" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={t("settings.profileName")} />
                            <button type="submit" className="primary-button !border-emerald-600 !bg-emerald-900 !bg-none !text-emerald-50 hover:!brightness-[1.14]" disabled={!isReady || isSaving}>{t("settings.createProfile")}</button>
                        </form>
                        <ul className="mt-4 grid gap-2">
                            {profiles.map((profile) => (
                                <li key={profile.id} className={`rounded-md border p-3 ${activeProfileId === profile.id ? 'border-gold/70 bg-gold/25' : 'border-border bg-black/10'}`}>
                                    {editingId === profile.id ? (
                                        <form className="flex flex-wrap gap-2" onSubmit={(event) => {
                                            event.preventDefault()
                                            void runProfileAction(async () => { await renameProfile(profile.id, editingName); setEditingId(null) })
                                        }}>
                                            <label className="sr-only" htmlFor={`edit-profile-${profile.id}`}>{t("settings.editProfileName")}</label>
                                            <input id={`edit-profile-${profile.id}`} className="min-w-0 flex-1 rounded border border-border bg-panel px-3 py-2 text-xs text-cream" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                                            <button className="primary-button size-9 !min-h-0 !p-0" type="submit" aria-label={t("settings.saveProfileName")} title={t("settings.saveProfileName")} disabled={isSaving}><Save size={16} aria-hidden="true" /></button>
                                            <button className="secondary-button shadow-[0_5px_16px_rgba(80,8,25,0.25)] hover:!brightness-[1.14]" type="button" onClick={() => setEditingId(null)}>{t("common.cancel")}</button>
                                        </form>
                                    ) : (
                                        <div className="flex min-h-9 flex-wrap items-center gap-2">
                                            <button type="button" aria-current={activeProfileId === profile.id ? 'true' : undefined} className="min-w-0 flex-1 text-left text-sm text-cream hover:text-gold-bright" disabled={!isReady || isSaving || activeProfileId === profile.id} onClick={() => void runProfileAction(() => selectProfile(profile.id))}>{profile.id === 'default' ? t("settings.defaultProfile") : profile.name}{activeProfileId === profile.id ? t("settings.activeSuffix") : ''}</button>
                                            {profile.id !== 'default' && <>
                                                <button type="button" className="secondary-button size-9 !min-h-0 !border-orange-600 !bg-orange-900 !p-0 !text-orange-50 shadow-[0_5px_16px_rgba(80,8,25,0.25)] hover:!brightness-[1.14]" aria-label={t("common.renameNamed", { name: profile.name })} title={t("common.renameNamed", { name: profile.name })} disabled={isSaving} onClick={() => { setEditingId(profile.id); setEditingName(profile.name); setDeletingId(null) }}><Pencil size={16} aria-hidden="true" /></button>
                                                <button type="button" className="secondary-button size-9 !min-h-0 !border-red-600 !bg-red-900 !p-0 !text-red-50 shadow-[0_5px_16px_rgba(80,8,25,0.25)] hover:!brightness-[1.14]" aria-label={t("common.deleteNamed", { name: profile.name })} title={t("common.deleteNamed", { name: profile.name })} disabled={isSaving} onClick={() => { setDeletingId(profile.id); setEditingId(null) }}><Trash2 size={16} aria-hidden="true" /></button>
                                            </>}
                                        </div>
                                    )}
                                    {deletingId === profile.id && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-red-200">
                                        <span>{t("common.delete")} {profile.id === 'default' ? t("settings.defaultProfile") : profile.name}?</span>
                                        <button type="button" className="secondary-button shadow-[0_5px_16px_rgba(80,8,25,0.25)] hover:!brightness-[1.14]" onClick={() => setDeletingId(null)}>{t("common.cancel")}</button>
                                        <button type="button" className="primary-button" disabled={isSaving} onClick={() => void runProfileAction(async () => { await deleteProfile(profile.id); setDeletingId(null) })}>{t("common.confirmDelete")}</button>
                                    </div>}
                                </li>
                            ))}
                        </ul>
                        {profileError && <p role="alert" className="mt-4 text-xs text-red-300">{message(profileError)}</p>}
                    </section>

                    {isSaving && <p role="status" className="mt-4 text-xs text-muted">{t("settings.saving")}</p>}
                    {successMessage && <p role="status" className="mt-4 text-xs text-emerald-400">{message(successMessage)}</p>}
                    {error && <p role="alert" className="mt-4 text-xs leading-5 text-red-300">{message(error)}</p>}
                </div>
            </div>
            {showResetAlert && <AlertDialog
                title={t("settings.resetTitle")}
                message={t("settings.resetMessage")}
                onCancel={() => setShowResetAlert(false)}
                onConfirm={() => void reset()}
            />}
            {showImportAlert && <AlertDialog
                title={t("settings.importTitle")}
                message={t("settings.importMessage")}
                onCancel={() => setShowImportAlert(false)}
                onConfirm={() => { setShowImportAlert(false); fileInputRef.current?.click() }}
            />}
        </ModalDialog>
    )
}
