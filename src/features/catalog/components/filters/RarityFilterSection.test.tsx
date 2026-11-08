import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RarityFilterSection } from './RarityFilterSection'

describe('rarity scale filter', () => {
    it('orders available rarities and keeps simultaneous selections independent', async () => {
        const user = userEvent.setup()
        const onToggle = vi.fn()
        render(<RarityFilterSection
            options={['Unknown', 'Very Rare', 'Common', 'Varies', 'Rare']}
            selected={['Rare', 'Very Rare']}
            onToggle={onToggle}
        />)

        const heading = screen.getByRole('button', { name: 'Rarity' })
        expect(heading).toHaveAttribute('aria-expanded', 'false')
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
        await user.click(heading)

        const group = screen.getByRole('group', { name: 'Rarity' })
        expect(within(group).getAllByRole('checkbox').map((checkbox) => checkbox.closest('label')?.textContent))
            .toEqual(['Common', 'Rare', 'Very Rare', 'Varies', 'Unknown'])
        expect(screen.queryByRole('checkbox', { name: 'Legendary' })).not.toBeInTheDocument()
        expect(screen.getByRole('checkbox', { name: 'Rare' })).toBeChecked()
        expect(screen.getByRole('checkbox', { name: 'Very Rare' })).toBeChecked()
        await user.click(screen.getByRole('checkbox', { name: 'Rare' }))
        expect(onToggle).toHaveBeenLastCalledWith('Rare')
        expect(screen.getByRole('checkbox', { name: 'Very Rare' })).toBeChecked()
        const unknown = screen.getByRole('checkbox', { name: 'Unknown' })
        unknown.focus()
        await user.keyboard(' ')
        expect(onToggle).toHaveBeenLastCalledWith('Unknown')
    })

    it('shows special rarities even when no standard rarities are available', async () => {
        const user = userEvent.setup()
        render(<RarityFilterSection options={['Unknown']} selected={['Unknown']} onToggle={vi.fn()} />)
        await user.click(screen.getByRole('button', { name: 'Rarity' }))
        expect(screen.getAllByRole('checkbox')).toHaveLength(1)
        expect(screen.getByRole('checkbox', { name: 'Unknown' })).toBeChecked()
    })
})
