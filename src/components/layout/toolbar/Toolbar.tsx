import { useEffect, useRef, useState } from 'react'
import { Info, Settings, Shield, Swords } from 'lucide-react'
import { SettingsModal } from '@/features/settings'
import { SystemInfoModal } from './SystemInfoModal'

type ToolbarModal = 'settings' | 'about' | null

export function Toolbar() {
  const [openModal, setOpenModal] = useState<ToolbarModal>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    const onMouseDown = (event: MouseEvent) => {
      if (!menuContainerRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const openSelectedModal = (modal: Exclude<ToolbarModal, null>) => {
    setMenuOpen(false)
    setOpenModal(modal)
  }

  return (
    <>
      <header className="flex h-15 shrink-0 items-center justify-between border-b border-gold/35 bg-header px-4 md:px-5">
        <div>
          <h1 className="font-display text-sm font-semibold tracking-wide text-gold-bright md:text-base">The Arcane Bazaar</h1>
          <p className="mt-0.5 hidden text-[9px] tracking-wide text-violet-300/70 sm:block">Magic Item Market & Pricing Guide</p>
        </div>
        <div className="flex items-center gap-3 text-muted">
          <span className="hidden items-center gap-2 font-display text-[10px] uppercase tracking-[0.15em] md:flex"><Swords size={17} /> D&amp;D 5.5e</span>
          <span className="h-4 w-px bg-border" />
          <div ref={menuContainerRef} className="relative">
            <button
              ref={menuButtonRef}
              className="icon-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Open system menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="System menu"
            >
              <Shield size={17} className="text-gold-bright" />
            </button>
            {menuOpen && (
              <div role="menu" aria-label="System menu" className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded border border-gold/40 bg-panel-strong py-1 shadow-2xl">
                <button role="menuitem" className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-cream hover:bg-white/5 hover:text-gold-bright" onClick={() => openSelectedModal('settings')}>
                  <Settings size={15} className="text-muted" /> Settings
                </button>
                <button role="menuitem" className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-cream hover:bg-white/5 hover:text-gold-bright" onClick={() => openSelectedModal('about')}>
                  <Info size={15} className="text-muted" /> About
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {openModal === 'settings' && <SettingsModal onClose={() => setOpenModal(null)} />}
      {openModal === 'about' && <SystemInfoModal onClose={() => setOpenModal(null)} />}
    </>
  )
}
