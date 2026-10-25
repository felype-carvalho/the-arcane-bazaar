import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ItemImage } from '../../model/items/item-images'

interface ItemImageViewerProps {
    itemName: string
    images: readonly ItemImage[]
    activeIndex: number
    returnFocusRef: RefObject<HTMLButtonElement | null>
    onIndexChange: (index: number) => void
    onClose: () => void
}

export function ItemImageViewer({ itemName, images, activeIndex, returnFocusRef, onIndexChange, onClose }: ItemImageViewerProps) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    const image = images[activeIndex]
    const hasMultipleImages = images.length > 1

    useEffect(() => {
        dialogRef.current?.focus()
        return () => { setTimeout(() => returnFocusRef.current?.focus(), 0) }
    }, [returnFocusRef])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
            } else if (event.key === 'ArrowLeft' && hasMultipleImages) {
                event.preventDefault()
                onIndexChange((activeIndex - 1 + images.length) % images.length)
            } else if (event.key === 'ArrowRight' && hasMultipleImages) {
                event.preventDefault()
                onIndexChange((activeIndex + 1) % images.length)
            } else if (event.key === 'Tab' && dialogRef.current) {
                const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
                if (!buttons.length) return
                const first = buttons[0]
                const last = buttons[buttons.length - 1]
                if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
                    event.preventDefault()
                    last.focus()
                } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
                    event.preventDefault()
                    first.focus()
                }
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [activeIndex, hasMultipleImages, images.length, onClose, onIndexChange])

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${itemName} images`} tabIndex={-1} className="flex h-full w-full max-w-[1600px] flex-col rounded-xl border border-border bg-panel p-3 text-cream outline-none sm:p-5">
                <div className="flex shrink-0 items-center justify-between gap-3">
                    <h2 className="min-w-0 truncate font-display text-sm text-gold-bright sm:text-base">{itemName}</h2>
                    <button type="button" className="icon-button shrink-0" aria-label="Close image viewer" onClick={onClose}><X size={22} /></button>
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-4">
                    {hasMultipleImages && <button type="button" className="icon-button shrink-0" aria-label="Previous image" onClick={() => onIndexChange((activeIndex - 1 + images.length) % images.length)}><ChevronLeft size={26} /></button>}
                    <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch">
                        {failedSrc === image.src
                            ? <p role="status" className="text-sm text-silver">Image unavailable.</p>
                            : <img className="max-h-full max-w-full object-contain" src={image.src} width={image.width} height={image.height} alt={`${itemName}, image ${activeIndex + 1} of ${images.length}`} onError={() => setFailedSrc(image.src)} />}
                    </div>
                    {hasMultipleImages && <button type="button" className="icon-button shrink-0" aria-label="Next image" onClick={() => onIndexChange((activeIndex + 1) % images.length)}><ChevronRight size={26} /></button>}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 pt-2 text-xs text-silver">
                    <span>{activeIndex + 1} / {images.length}</span>
                    {image.credit && <span className="min-w-0 truncate" title={image.credit}>Image: {image.credit}</span>}
                </div>
            </div>
        </div>,
        document.body,
    )
}
