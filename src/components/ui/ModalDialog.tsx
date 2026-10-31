import { useInterfaceTranslation } from '@/app/i18n'
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalDialogProps {
    children?: ReactNode
    dialogHeight?: CSSProperties['height']
    dialogWidth?: CSSProperties['width']
    eyebrow: string
    icon: ReactNode
    inactive?: boolean
    onClose: () => void
    title: string
    titleId: string
}

export function ModalDialog({ children, dialogHeight, dialogWidth, eyebrow, icon, inactive = false, onClose, title, titleId }: ModalDialogProps) {
    const { t } = useInterfaceTranslation()
    const dialogRef = useRef<HTMLDivElement>(null)
    const hasFocusedRef = useRef(false)
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null
        return () => previous?.focus()
    }, [])

    useEffect(() => {
        const dialog = dialogRef.current
        if (!inactive && !hasFocusedRef.current) {
            dialog?.focus()
            hasFocusedRef.current = true
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (inactive) return
            if (event.key === 'Escape') onCloseRef.current()
            if (event.key !== 'Tab' || !dialog) return

            const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
                .filter((element) => !element.hasAttribute('disabled'))
            if (!focusable.length) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }

        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [inactive])

    return (
        <div className="modal-backdrop" inert={inactive} aria-hidden={inactive || undefined} onMouseDown={(event) => { if (!inactive && event.currentTarget === event.target) onClose() }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="modal-card modal-dialog" style={{ height: dialogHeight, width: dialogWidth }}>
                <div className="modal-header">
                    <div className="flex items-center gap-4">
                        <div className="item-icon-tile small" aria-hidden="true">{icon}</div>
                        <div><p className="eyebrow">{eyebrow}</p><h2 id={titleId} className="mt-1 font-display text-xl text-gold-bright">{title}</h2></div>
                    </div>
                    <button className="icon-button" onClick={onClose} aria-label={t("common.closeNamed", { name: title.toLocaleLowerCase() })}><X size={20} /></button>
                </div>
                {children && <div className="min-h-0 overflow-y-auto p-6 md:p-8">{children}</div>}
            </div>
        </div>
    )
}
