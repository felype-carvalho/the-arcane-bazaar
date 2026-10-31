import { changeLanguage, useInterfaceTranslation, type Language } from '@/app/i18n'
import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronLeft, Info, Languages, Settings, Shield, Swords } from 'lucide-react'
import { SettingsModal } from '@/features/settings'
import { SystemInfoModal } from './SystemInfoModal'

type ToolbarModal = 'settings' | 'about' | null

const LANGUAGE_OPTIONS = [
    { value: 'en-US', label: 'English' },
    { value: 'pt-BR', label: 'Português' },
] as const satisfies readonly { value: Language; label: string }[]

export function Toolbar() {
    const { t, language } = useInterfaceTranslation()
    const [openModal, setOpenModal] = useState<ToolbarModal>(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
    const menuContainerRef = useRef<HTMLDivElement>(null)
    const menuButtonRef = useRef<HTMLButtonElement>(null)
    const languageButtonRef = useRef<HTMLButtonElement>(null)
    const languageMenuRef = useRef<HTMLDivElement>(null)
    const languageMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const focusLanguageMenuRef = useRef(false)
    const languageMenuId = useId()

    useEffect(() => {
        if (languageMenuOpen && focusLanguageMenuRef.current) {
            languageMenuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
            focusLanguageMenuRef.current = false
        }
    }, [languageMenuOpen])

    useEffect(() => {
        if (!menuOpen) return

        const onMouseDown = (event: MouseEvent) => {
            if (!menuContainerRef.current?.contains(event.target as Node)) {
                setMenuOpen(false)
                setLanguageMenuOpen(false)
            }
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            setMenuOpen(false)
            setLanguageMenuOpen(false)
            menuButtonRef.current?.focus()
        }

        document.addEventListener('mousedown', onMouseDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('keydown', onKeyDown)
            if (languageMenuCloseTimerRef.current) clearTimeout(languageMenuCloseTimerRef.current)
        }
    }, [menuOpen])

    const openSelectedModal = (modal: Exclude<ToolbarModal, null>) => {
        setMenuOpen(false)
        setLanguageMenuOpen(false)
        setOpenModal(modal)
    }

    return (
        <>
            <header className="flex h-15 shrink-0 items-center justify-between border-b border-gold/35 bg-header px-4 md:px-5">
                <div>
                    <h1 className="font-display text-sm font-semibold tracking-wide text-gold-bright md:text-base">The Arcane Bazaar</h1>
                    <p className="mt-0.5 hidden text-[9px] tracking-wide text-violet-300/70 sm:block">{t("toolbar.subtitle")}</p>
                </div>
                <div className="flex items-center gap-2 text-muted">
                    <span className="hidden items-center gap-2 font-display text-[10px] uppercase tracking-[0.15em] md:flex"><Swords size={17} /> D&amp;D 5.5e</span>
                    <div ref={menuContainerRef} className="relative">
                        <button
                            ref={menuButtonRef}
                            className="icon-button"
                            onClick={() => { setMenuOpen((open) => !open); setLanguageMenuOpen(false) }}
                            aria-label={t("toolbar.openMenu")}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            title={t("toolbar.menu")}
                        >
                            <Shield size={17} className="text-gold-bright" />
                        </button>
                        {menuOpen && (
                            <div role="menu" aria-label={t("toolbar.menu")} className="absolute right-0 top-full z-50 mt-2 w-44 rounded border border-gold/40 bg-panel-strong py-1 shadow-2xl">
                                <button role="menuitem" className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-cream hover:bg-white/5 hover:text-gold-bright" onClick={() => openSelectedModal('settings')}>
                                    <Settings size={15} className="text-muted" /> {t("toolbar.settings")}</button>
                                <div role="none" className="relative" onMouseEnter={() => {
                                    if (languageMenuCloseTimerRef.current) clearTimeout(languageMenuCloseTimerRef.current)
                                    setLanguageMenuOpen(true)
                                }} onMouseLeave={() => {
                                    languageMenuCloseTimerRef.current = setTimeout(() => setLanguageMenuOpen(false), 150)
                                }} onBlur={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setLanguageMenuOpen(false)
                                }}>
                                    <button
                                        ref={languageButtonRef}
                                        role="menuitem"
                                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-cream hover:bg-white/5 hover:text-gold-bright"
                                        aria-haspopup="menu"
                                        aria-expanded={languageMenuOpen}
                                        aria-controls={languageMenuOpen ? languageMenuId : undefined}
                                        onClick={() => setLanguageMenuOpen(true)}
                                        onKeyDown={(event) => {
                                            if (!['ArrowLeft', 'ArrowDown', 'Enter', ' '].includes(event.key)) return
                                            event.preventDefault()
                                            if (languageMenuOpen) languageMenuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
                                            else {
                                                focusLanguageMenuRef.current = true
                                                setLanguageMenuOpen(true)
                                            }
                                        }}
                                    >
                                        <Languages size={15} className="text-muted" />
                                        <span className="flex-1">{t("toolbar.language")}</span>
                                        <ChevronLeft size={12} className="text-muted" />
                                    </button>
                                    {languageMenuOpen && <div role="none" className="absolute right-full top-0 w-32">
                                        <div ref={languageMenuRef} id={languageMenuId} role="menu" aria-label={t("toolbar.language")} className="rounded border border-gold/40 bg-panel-strong py-1 shadow-2xl" onKeyDown={(event) => {
                                            if (event.key === 'Escape' || event.key === 'ArrowRight') {
                                                event.preventDefault()
                                                event.stopPropagation()
                                                setLanguageMenuOpen(false)
                                                languageButtonRef.current?.focus()
                                            } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                                                event.preventDefault()
                                                const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
                                                const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
                                                const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
                                                buttons[nextIndex]?.focus()
                                            }
                                        }}>
                                            {LANGUAGE_OPTIONS.map((option) => <button
                                                key={option.value}
                                                role="menuitemradio"
                                                aria-checked={language === option.value}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-cream hover:bg-white/5 hover:text-gold-bright"
                                                onClick={() => {
                                                    void changeLanguage(option.value)
                                                    setLanguageMenuOpen(false)
                                                    setMenuOpen(false)
                                                    menuButtonRef.current?.focus()
                                                }}
                                            >
                                                <Check size={14} aria-hidden="true" className={`shrink-0 text-gold ${language === option.value ? '' : 'invisible'}`} />
                                                {option.label}
                                            </button>)}
                                        </div>
                                    </div>}
                                </div>
                                <button role="menuitem" className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-cream hover:bg-white/5 hover:text-gold-bright" onClick={() => openSelectedModal('about')}>
                                    <Info size={15} className="text-muted" /> {t("toolbar.about")}</button>
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
