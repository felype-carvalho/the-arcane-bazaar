import { createRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Tooltip } from './Tooltip'

afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
})

describe('shared tooltip', () => {
    it('renders in a portal with measurement styling and preserves trigger semantics, refs and actions', () => {
        const reference = createRef<HTMLButtonElement>()
        const action = vi.fn()
        const { container } = render(<Tooltip content={'English: Backpack\nPortuguês: Mochila'}>
            <button ref={reference} aria-describedby="existing-description" onClick={action}>Item</button>
        </Tooltip>)
        const trigger = screen.getByRole('button', { name: 'Item' })
        expect(reference.current).toBe(trigger)
        fireEvent.mouseEnter(trigger)
        const tooltip = screen.getByRole('tooltip')
        expect(container).not.toContainElement(tooltip)
        expect(tooltip).toHaveClass('border-gold/60', 'bg-panel-strong', 'text-cream', 'shadow-xl', 'whitespace-pre-line')
        expect(tooltip.textContent).toBe('English: Backpack\nPortuguês: Mochila')
        expect(trigger).toHaveAttribute('aria-describedby', `existing-description ${tooltip.id}`)
        expect(trigger).not.toHaveAttribute('title')
        fireEvent.click(trigger)
        expect(action).toHaveBeenCalledOnce()
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-describedby', 'existing-description')
    })

    it('allows moving the pointer into the tooltip and dismisses after leaving', () => {
        vi.useFakeTimers()
        render(<Tooltip content="Details"><span>Item</span></Tooltip>)
        fireEvent.mouseEnter(screen.getByText('Item'))
        const tooltip = screen.getByRole('tooltip')
        fireEvent.mouseLeave(screen.getByText('Item'))
        fireEvent.mouseEnter(tooltip)
        act(() => vi.advanceTimersByTime(200))
        expect(tooltip).toBeInTheDocument()
        fireEvent.mouseLeave(tooltip)
        act(() => vi.advanceTimersByTime(150))
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('supports focus and optional tap, consumes Escape before a parent and dismisses outside', () => {
        const parentEscape = vi.fn()
        render(<div onKeyDown={parentEscape}><Tooltip content="Details" openOnClick><button>Info</button></Tooltip></div>)
        const trigger = screen.getByRole('button', { name: 'Info' })
        fireEvent.focus(trigger)
        expect(screen.getByRole('tooltip')).toHaveTextContent('Details')
        fireEvent.keyDown(trigger, { key: 'Escape' })
        expect(parentEscape).not.toHaveBeenCalled()
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
        fireEvent.click(trigger)
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
        fireEvent.pointerDown(document.body)
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
        fireEvent.focus(trigger)
        fireEvent.blur(trigger)
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })

    it('shows only one tooltip at a time and does not bubble tooltip clicks into catalog rows', () => {
        const select = vi.fn()
        render(<div onClick={select}>
            <Tooltip content="First details"><span>First</span></Tooltip>
            <Tooltip content="Second details"><span>Second</span></Tooltip>
        </div>)
        fireEvent.mouseEnter(screen.getByText('First'))
        fireEvent.mouseEnter(screen.getByText('Second'))
        expect(screen.getAllByRole('tooltip')).toHaveLength(1)
        expect(screen.getByRole('tooltip')).toHaveTextContent('Second details')
        fireEvent.click(screen.getByRole('tooltip'))
        expect(select).not.toHaveBeenCalled()
    })

    it('keeps the tooltip inside the viewport and moves above a low trigger', () => {
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            return this.getAttribute('role') === 'tooltip'
                ? { width: 280, height: 60 } as DOMRect
                : { left: window.innerWidth - 20, bottom: window.innerHeight - 5, top: window.innerHeight - 25 } as DOMRect
        })
        render(<Tooltip content="Details"><span>Item</span></Tooltip>)
        fireEvent.mouseEnter(screen.getByText('Item'))
        expect(screen.getByRole('tooltip')).toHaveStyle({ left: `${window.innerWidth - 288}px`, top: `${window.innerHeight - 93}px` })
    })
})
