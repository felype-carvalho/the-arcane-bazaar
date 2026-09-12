import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ToolbarDialogProps {
  children?: ReactNode
  dialogWidth?: CSSProperties['width']
  eyebrow: string
  icon: ReactNode
  onClose: () => void
  title: string
  titleId: string
}

export function ToolbarDialog({ children, dialogWidth, eyebrow, icon, onClose, title, titleId }: ToolbarDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    dialog?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
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
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="modal-card toolbar-modal" style={dialogWidth ? { width: dialogWidth } : undefined}>
        <div className="modal-header">
          <div className="flex items-center gap-4">
            <div className="item-icon-tile small" aria-hidden="true">{icon}</div>
            <div><p className="eyebrow">{eyebrow}</p><h2 id={titleId} className="mt-1 font-display text-xl text-gold-bright">{title}</h2></div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={`Close ${title.toLocaleLowerCase('en-US')}`}><X size={20} /></button>
        </div>
        {children && <div className="min-h-0 overflow-y-auto p-6 md:p-8">{children}</div>}
      </div>
    </div>
  )
}
