import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ITEM_FIXTURES } from '../test/fixtures/items'
import { formatSourceTitle } from './item/SourceChip'
import { Catalog } from './Catalog'

vi.mock('../api/catalog', async () => {
    const { ITEM_FIXTURES: fixtures } = await import('../test/fixtures/items')
    return {
        getItems: async () => [
            ...Array.from({ length: 21 }, (_, index) => ({ ...fixtures[0], id: `relic-${index}`, name: `Relic ${index}`, source: 'DMG' })),
            { ...fixtures[0], id: 'modern', name: 'Modern Relic', source: 'XDMG' },
            { ...fixtures[0], id: 'mundane-dmg', name: 'DMG Gear', type: 'Common', source: 'DMG' },
            { ...fixtures[0], id: 'mundane-phb', name: 'PHB Gear', type: 'Common', source: 'PHB' },
        ],
    }
})

async function openSources(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByRole('table')
    const toggle = screen.getByRole('button', { name: 'Source' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    return screen.getByRole('group', { name: 'Source' })
}

describe('catalog source filters', () => {
    it('selects multiple sources, handles All and clearing, and preserves page size while returning to page one', async () => {
        const user = userEvent.setup()
        render(<Catalog />)
        const sources = await openSources(user)
        expect(within(sources).getAllByRole('button').slice(1).map((button) => button.getAttribute('aria-label')))
            .toEqual([null, formatSourceTitle('DMG'), formatSourceTitle('PHB')])
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        expect(within(sources).queryByRole('button', { name: formatSourceTitle('PHB') })).not.toBeInTheDocument()
        await user.selectOptions(screen.getByRole('combobox', { name: 'Items per page' }), '10')
        await user.click(screen.getByRole('button', { name: 'Next page' }))
        await user.click(within(sources).getByRole('button', { name: formatSourceTitle('DMG') }))
        expect(screen.getByRole('button', { name: 'Page 1, current page' })).toBeInTheDocument()
        expect(screen.getByRole('combobox', { name: 'Items per page' })).toHaveValue('10')
        expect(within(sources).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
        await user.click(within(sources).getByRole('button', { name: formatSourceTitle('XDMG') }))
        await user.selectOptions(screen.getByRole('combobox', { name: 'Items per page' }), '50')
        expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(23)
        await user.click(within(sources).getByRole('button', { name: formatSourceTitle('DMG') }))
        expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
        expect(screen.getByRole('row', { name: /Modern Relic/ })).toBeInTheDocument()
        await user.click(within(sources).getByRole('button', { name: 'All' }))
        expect(within(sources).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
        expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(23)
        await user.click(within(sources).getByRole('button', { name: formatSourceTitle('XDMG') }))
        await user.click(screen.getByRole('button', { name: 'Clear all filters' }))
        expect(within(sources).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('row', { name: /DMG Gear/ })).toBeInTheDocument()
        expect(screen.getByRole('row', { name: /PHB Gear/ })).toBeInTheDocument()
    })

    it('prunes unavailable selections on type and global configuration changes while preserving compatible sources', async () => {
        const user = userEvent.setup()
        const { rerender } = render(<Catalog />)
        const sources = await openSources(user)
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        await user.click(within(sources).getByRole('button', { name: formatSourceTitle('DMG') }))
        await user.click(within(sources).getByRole('button', { name: formatSourceTitle('XDMG') }))
        await user.click(screen.getByRole('radio', { name: 'Mundane' }))
        expect(within(sources).getByRole('button', { name: formatSourceTitle('DMG') })).toHaveAttribute('aria-pressed', 'true')
        expect(within(sources).queryByRole('button', { name: formatSourceTitle('XDMG') })).not.toBeInTheDocument()
        expect(screen.queryByRole('row', { name: /PHB Gear/ })).not.toBeInTheDocument()
        await user.click(screen.getByRole('radio', { name: 'Magic' }))
        expect(within(sources).getByRole('button', { name: formatSourceTitle('XDMG') })).toHaveAttribute('aria-pressed', 'false')
        await user.click(within(sources).getByRole('button', { name: formatSourceTitle('DMG') }))
        await user.click(within(sources).getByRole('button', { name: formatSourceTitle('XDMG') }))
        rerender(<Catalog selectedSources={[ITEM_FIXTURES[0].source]} />)
        await waitFor(() => expect(within(sources).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true'))
        expect(within(sources).queryByRole('button', { name: formatSourceTitle('XDMG') })).not.toBeInTheDocument()
        expect(screen.queryByRole('row', { name: /Modern Relic/ })).not.toBeInTheDocument()
        expect(screen.getByRole('table')).toBeInTheDocument()
    })
})
