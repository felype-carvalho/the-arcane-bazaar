import { useEffect, useId, useRef, useState } from 'react'
import { BookOpen, House, Menu, Store } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useInterfaceTranslation } from '@/app/i18n'

interface PrimaryNavigationProps {
    onMerchantOpen: () => void
}

const linkClassName = 'flex items-center gap-2 rounded px-3 py-2 text-xs transition-colors hover:bg-white/5 hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-gold'

export function PrimaryNavigation({ onMerchantOpen }: PrimaryNavigationProps) {
    const { t } = useInterfaceTranslation()
    const location = useLocation()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const navigationId = useId()

    useEffect(() => setIsOpen(false), [location.key])

    useEffect(() => {
        if (!isOpen) return

        const onMouseDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            setIsOpen(false)
            buttonRef.current?.focus()
        }
        document.addEventListener('mousedown', onMouseDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [isOpen])

    const closeNavigation = () => {
        if (isOpen) buttonRef.current?.focus()
        setIsOpen(false)
    }

    return (
        <div ref={containerRef} className="relative shrink-0 md:ml-3" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false)
        }}>
            <div className="md:hidden">
                <button
                    ref={buttonRef}
                    type="button"
                    className="icon-button"
                    aria-label={t('navigation.toggle')}
                    aria-expanded={isOpen}
                    aria-controls={navigationId}
                    onClick={() => setIsOpen((open) => !open)}
                >
                    <Menu size={20} aria-hidden="true" />
                </button>
            </div>
            <nav
                id={navigationId}
                aria-label={t('navigation.label')}
                className={`${isOpen ? 'flex' : 'hidden'} absolute right-0 top-full z-40 mt-2 w-40 flex-col gap-1 rounded border border-gold/40 bg-panel-strong p-1 shadow-2xl md:static md:mt-0 md:flex md:w-auto md:flex-row md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
            >
                <NavLink to="/" end onClick={closeNavigation} className={({ isActive }) => `${linkClassName} ${isActive ? 'bg-gold/10 text-gold-bright' : 'text-muted'}`}>
                    <House size={16} aria-hidden="true" />{t('navigation.home')}
                </NavLink>
                <NavLink to="/catalog" onClick={closeNavigation} className={({ isActive }) => `${linkClassName} ${isActive ? 'bg-gold/10 text-gold-bright' : 'text-muted'}`}>
                    <BookOpen size={16} aria-hidden="true" />{t('navigation.catalog')}
                </NavLink>
                <Link to="/merchant" className={`${linkClassName} text-muted`} onClick={(event) => {
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                    event.preventDefault()
                    closeNavigation()
                    onMerchantOpen()
                }}>
                    <Store size={16} aria-hidden="true" />{t('navigation.merchant')}
                </Link>
            </nav>
        </div>
    )
}
