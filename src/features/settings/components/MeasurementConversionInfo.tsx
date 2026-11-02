import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useInterfaceTranslation } from '@/app/i18n'
import { Info } from 'lucide-react'

export function MeasurementConversionInfo() {
    const { t } = useInterfaceTranslation()
    const [open, setOpen] = useState(false)
    const [position, setPosition] = useState({ left: 8, top: 8 })
    const anchor = useRef<HTMLButtonElement>(null)
    const tooltip = useRef<HTMLSpanElement>(null)
    const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const id = useId()
    const text = t('measurements.conversionInfo')
    const show = () => {
        clearTimeout(closeTimer.current)
        setOpen(true)
    }
    const leave = () => {
        if (document.activeElement === anchor.current) return
        closeTimer.current = setTimeout(() => setOpen(false), 150)
    }

    useEffect(() => () => clearTimeout(closeTimer.current), [])

    useLayoutEffect(() => {
        if (!open) return
        const update = () => {
            const rect = anchor.current?.getBoundingClientRect()
            const tip = tooltip.current?.getBoundingClientRect()
            if (!rect || !tip) return
            setPosition({
                left: Math.max(8, Math.min(rect.left, window.innerWidth - tip.width - 8)),
                top: Math.max(8, rect.bottom + tip.height + 8 < window.innerHeight ? rect.bottom + 8 : rect.top - tip.height - 8),
            })
        }
        update()
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        return () => {
            window.removeEventListener('resize', update)
            window.removeEventListener('scroll', update, true)
        }
    }, [open, text])

    useEffect(() => {
        if (!open) return
        const dismiss = (event: PointerEvent) => {
            if (!anchor.current?.contains(event.target as Node) && !tooltip.current?.contains(event.target as Node)) setOpen(false)
        }
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                event.stopImmediatePropagation()
                setOpen(false)
            }
        }
        document.addEventListener('pointerdown', dismiss, true)
        document.addEventListener('keydown', escape, true)
        return () => {
            document.removeEventListener('pointerdown', dismiss, true)
            document.removeEventListener('keydown', escape, true)
        }
    }, [open])

    return <>
        <button ref={anchor} type="button" aria-describedby={open ? id : undefined} aria-expanded={open} aria-label={t('measurements.conversionInfoLabel')}
            className="inline-flex shrink-0 cursor-help items-center justify-center rounded-sm p-1 text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            onMouseEnter={show} onMouseLeave={leave}
            onFocus={show} onBlur={() => setOpen(false)} onClick={show}>
            <Info size={15} aria-hidden="true" />
        </button>
        {open && createPortal(<span ref={tooltip} id={id} role="tooltip" style={position} onMouseEnter={show} onMouseLeave={leave}
            className="fixed z-[1000] w-80 max-w-[calc(100vw-16px)] rounded-md border border-gold/60 bg-panel-strong px-3 py-2 text-xs leading-5 text-cream shadow-xl">
            {text}
        </span>, document.body)}
    </>
}
