import { useState } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/app/i18n'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import type { Item } from '../../types'
import { DEFAULT_MODIFIERS } from '../../model/pricing'
import { PriceCalculator } from './PriceCalculator'
import { ItemModal } from '../item/ItemModal'

vi.mock('../../model/items/item-images', () => ({ getItemImages: vi.fn().mockResolvedValue([]) }))

beforeEach(async () => { await act(() => i18n.changeLanguage('en-US')) })
afterEach(async () => { await act(() => i18n.changeLanguage('en-US')) })

const item: Item = { ...ITEM_FIXTURES[0], basePriceGp: 100 }

function Calculator({ value = item, pending = false }: { value?: Item; pending?: boolean }) {
    const [manualPrice, setManualPrice] = useState('')
    const [modifiers, setModifiers] = useState(DEFAULT_MODIFIERS)
    return <PriceCalculator item={value} pendingSelection={pending ? 'groupOption' : undefined} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} />
}

describe('custom pricing and information', () => {
    it('adds amounts from all three currencies and restores the automatic price when cleared', async () => {
        const user = userEvent.setup()
        render(<Calculator />)
        const gp = screen.getByRole('spinbutton', { name: 'Custom base price (GP)' })
        const sp = screen.getByRole('spinbutton', { name: 'Custom base price (SP)' })
        const cp = screen.getByRole('spinbutton', { name: 'Custom base price (CP)' })
        await user.type(gp, '2')
        await user.type(sp, '5')
        await user.type(cp, '25')
        expect(screen.getByLabelText('Base price')).toHaveTextContent('2 GP7 SP5 CP')
        await act(() => i18n.changeLanguage('pt-BR'))
        expect(screen.getByRole('spinbutton', { name: 'Preço base personalizado (PC)' })).toHaveValue(25)
        await user.clear(gp)
        await user.clear(sp)
        await user.clear(cp)
        expect(screen.getByLabelText('Preço base')).toHaveTextContent('100 PO')
    })

    it('overrides the calculator price, updates crafting, and restores the automatic price when cleared', async () => {
        const user = userEvent.setup()
        render(<Calculator />)
        const input = screen.getByRole('spinbutton', { name: 'Custom base price (GP)' })
        expect(screen.getByLabelText('Base price')).toHaveTextContent('100 GP')
        await user.type(input, '19.99')
        expect(screen.getByLabelText('Base price')).toHaveTextContent('19 GP')
        await user.click(screen.getByRole('button', { name: 'Crafting information' }))
        expect(screen.getByRole('tooltip')).toHaveTextContent('Days: 1')
        expect(screen.getByRole('tooltip')).toHaveTextContent('Work hours: 8')
        await user.keyboard('{Escape}')
        await user.clear(input)
        expect(screen.getByLabelText('Base price')).toHaveTextContent('100 GP')
        await user.type(input, '0')
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(screen.queryByLabelText('Base price')).not.toBeInTheDocument()
        expect(screen.getByText('Enter a positive base price to calculate this item.')).toBeInTheDocument()
    })

    it('keeps the item sheet automatic and closes its crafting tooltip before closing the dialog', async () => {
        const user = userEvent.setup()
        const close = vi.fn()
        render(<><Calculator /><ItemModal item={item} onClose={close} /></>)
        await user.type(screen.getByRole('spinbutton', { name: 'Custom base price (GP)' }), '20')
        const dialog = screen.getByRole('dialog')
        await user.click(within(dialog).getByRole('button', { name: 'Crafting information' }))
        expect(screen.getByRole('tooltip')).toHaveTextContent('50 GP')
        expect(screen.getByRole('tooltip')).toHaveTextContent('Days: 10')
        await user.keyboard('{Escape}')
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
        expect(close).not.toHaveBeenCalled()
        expect(within(dialog).queryByRole('button', { name: 'Magic item pricing rules' })).not.toBeInTheDocument()
    })

    it('shows the 100% sell base for currency goods and translates the active tooltip', async () => {
        const user = userEvent.setup()
        render(<Calculator value={{ ...item, categories: ['Gem'] }} />)
        expect(screen.getByText('100% base · 0%')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Magic item pricing rules' }))
        expect(screen.getByRole('tooltip')).toHaveTextContent('Spell Scroll prices (2014 and 2024)')
        await act(() => i18n.changeLanguage('pt-BR'))
        expect(screen.getByRole('tooltip')).toHaveTextContent('Pergaminho Mágico')
        expect(screen.getByRole('spinbutton', { name: 'Preço base personalizado (PO)' })).toBeInTheDocument()
    })

    it('does not bypass a required version selection or show magical help for mundane items', () => {
        const { rerender } = render(<Calculator pending />)
        expect(screen.queryByRole('spinbutton', { name: 'Custom base price (GP)' })).not.toBeInTheDocument()
        rerender(<Calculator value={{ ...item, type: 'Common' }} />)
        expect(screen.queryByRole('button', { name: 'Magic item pricing rules' })).not.toBeInTheDocument()
        expect(screen.getByRole('spinbutton', { name: 'Custom base price (GP)' })).toBeInTheDocument()
    })
})
