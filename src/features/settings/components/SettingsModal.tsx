import { RotateCcw, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ToolbarDialog } from '@/components/layout/toolbar/ToolbarDialog'
import { SourceChip } from '@/features/catalog/components/item/SourceChip'
import { normalizeSource, SOURCES_BY_EDITION, type SourceEdition } from '@/features/catalog/model/sources'
import { useSettings } from '../model/SettingsProvider'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, isReady, isSaving, error, setSourceEnabled, setSourcesEnabled, resetLocalData } = useSettings()
  const [confirmReset, setConfirmReset] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const selectedSources = new Set(settings.selectedSources.map(normalizeSource))
  const sourceSelectionDisabled = !isReady || isSaving

  const updateSources = (sources: readonly string[], enabled: boolean) => {
    setSuccessMessage('')
    void setSourcesEnabled(sources, enabled)
  }

  const renderSourceGroup = (edition: SourceEdition) => {
    const sources = SOURCES_BY_EDITION[edition]
    const sourceCodes = sources.map(({ source }) => source)
    const selectedCount = sourceCodes.filter((source) => selectedSources.has(normalizeSource(source))).length
    const titleId = `content-sources-${edition.replace('.', '-')}`

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
        <div className="mt-3 flex flex-wrap gap-2">
          {sources.map(({ source }) => {
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
    <ToolbarDialog
      dialogWidth="min(1080px, 100%)"
      eyebrow="System"
      icon={<Settings size={20} />}
      onClose={onClose}
      title="Settings"
      titleId="settings-modal-title"
    >
      <div className="grid gap-7">
        <section aria-labelledby="content-sources-title">
          <h3 id="content-sources-title" className="font-display text-xs uppercase tracking-[0.12em] text-gold">Content sources</h3>
          <p className="mt-2 text-[11px] leading-5 text-muted">Choose which publications can contribute items and compatible variant bases to the catalog.</p>
          <div className="mt-4 grid gap-4">
            {renderSourceGroup('5.5e')}
            {renderSourceGroup('5e')}
          </div>
        </section>

        <section aria-labelledby="local-data-title" className="border-t border-border pt-6">
          <h3 id="local-data-title" className="font-display text-xs uppercase tracking-[0.12em] text-gold">Local data</h3>
          <p className="mt-2 text-[11px] leading-5 text-muted">Delete this application's IndexedDB database and restore every setting to its default value.</p>

          {!confirmReset ? (
            <button className="secondary-button mt-4 border-red-900/70 text-red-300 hover:border-red-700 hover:text-red-200" disabled={isSaving} onClick={() => { setSuccessMessage(''); setConfirmReset(true) }}>
              <Trash2 size={14} /> Reset local data
            </button>
          ) : (
            <div className="mt-4 rounded-md border border-red-900/70 bg-red-950/20 p-4">
              <p className="text-xs leading-5 text-red-200">Reset the IndexedDB database and select every content source?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="secondary-button" disabled={isSaving} onClick={() => setConfirmReset(false)}>Cancel</button>
                <button className="primary-button" disabled={isSaving} onClick={() => void reset()}><RotateCcw size={14} /> Reset IndexedDB</button>
              </div>
            </div>
          )}
        </section>

        {isSaving && <p role="status" className="text-xs text-muted">Saving local settings...</p>}
        {successMessage && <p role="status" className="text-xs text-emerald-400">{successMessage}</p>}
        {error && <p role="alert" className="text-xs leading-5 text-red-300">{error}</p>}
      </div>
    </ToolbarDialog>
  )
}
