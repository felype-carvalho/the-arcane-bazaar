import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'

type TriggerProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }

interface TooltipProps {
    content: ReactNode
    children: ReactElement<TriggerProps>
    openOnClick?: boolean
}

let dismissActiveTooltip: (() => void) | undefined

export function Tooltip({ content, children, openOnClick = false }: TooltipProps) {
    const [open, setOpen] = useState(false)
    const [position, setPosition] = useState({ left: 8, top: 8 })
    const anchor = useRef<HTMLElement | null>(null)
    const tooltip = useRef<HTMLSpanElement>(null)
    const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const id = useId()
    const visible = open && Boolean(content)
    const originalRef = children.props.ref
    const close = useCallback(() => {
        clearTimeout(closeTimer.current)
        setOpen(false)
    }, [])
    const setAnchor = useCallback((element: HTMLElement | null) => {
        anchor.current = element
        if (typeof originalRef === 'function') return originalRef(element)
        if (originalRef) originalRef.current = element
    }, [originalRef])
    const show = () => {
        if (!content) return
        clearTimeout(closeTimer.current)
        if (dismissActiveTooltip !== close) dismissActiveTooltip?.()
        dismissActiveTooltip = close
        setOpen(true)
    }
    const leave = () => {
        if (anchor.current?.contains(document.activeElement)) return
        clearTimeout(closeTimer.current)
        closeTimer.current = setTimeout(close, 150)
    }

    useEffect(() => () => {
        clearTimeout(closeTimer.current)
        if (dismissActiveTooltip === close) dismissActiveTooltip = undefined
    }, [close])

    useLayoutEffect(() => {
        if (!visible) return
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
    }, [visible, content])

    useEffect(() => {
        if (!visible) return
        const dismiss = (event: PointerEvent) => {
            if (!anchor.current?.contains(event.target as Node) && !tooltip.current?.contains(event.target as Node)) close()
        }
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            event.stopImmediatePropagation()
            close()
        }
        document.addEventListener('pointerdown', dismiss, true)
        document.addEventListener('keydown', escape, true)
        return () => {
            document.removeEventListener('pointerdown', dismiss, true)
            document.removeEventListener('keydown', escape, true)
        }
    }, [visible, close])

    return <>
        {cloneElement(children, {
            ref: setAnchor,
            title: undefined,
            'aria-describedby': [children.props['aria-describedby'], visible ? id : undefined].filter(Boolean).join(' ') || undefined,
            onMouseEnter: (event) => { children.props.onMouseEnter?.(event); show() },
            onMouseLeave: (event) => { children.props.onMouseLeave?.(event); leave() },
            onFocus: (event) => { children.props.onFocus?.(event); show() },
            onBlur: (event) => {
                children.props.onBlur?.(event)
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close()
            },
            onClick: (event) => {
                children.props.onClick?.(event)
                if (openOnClick) show()
                else close()
            },
        })}
        {visible && createPortal(<span ref={tooltip} id={id} role="tooltip" style={position}
            onMouseEnter={show} onMouseLeave={leave} onClick={(event) => event.stopPropagation()}
            className="fixed z-[1000] grid max-h-[calc(100vh-16px)] max-w-[min(20rem,calc(100vw-16px))] gap-1 overflow-y-auto whitespace-pre-line break-words rounded-md border border-gold/60 bg-panel-strong px-3 py-2 text-left font-sans text-xs font-normal normal-case leading-5 tracking-normal text-cream shadow-xl">
            {content}
        </span>, document.body)}
    </>
}
