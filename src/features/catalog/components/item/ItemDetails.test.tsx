import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { DEFAULT_MODIFIERS } from '../../model/pricing'
import { getItemImages, type ItemImage } from '../../model/items/item-images'
import { ITEM_FIXTURES } from '../../test/fixtures/items'
import type { Item, ItemGroupOption, VariantBaseOption } from '../../types'
import { ItemDetails } from './ItemDetails'

vi.mock('../../model/items/item-images', () => ({ getItemImages: vi.fn() }))

const item = ITEM_FIXTURES[0]
const images: ItemImage[] = [
    { src: 'https://example.com/first.png', credit: 'First artist' },
    { src: 'https://example.com/second.png' },
]

function details(overrides: Partial<ComponentProps<typeof ItemDetails>> = {}) {
    return <ItemDetails item={item} onGroupOptionSelect={vi.fn()} onVariantOptionSelect={vi.fn()} onOpenModal={vi.fn()} modifiers={DEFAULT_MODIFIERS} setModifiers={vi.fn()} manualPrice="" setManualPrice={vi.fn()} {...overrides} />
}

beforeEach(() => {
    vi.mocked(getItemImages).mockReset().mockResolvedValue(images)
})

describe('ItemDetails artwork', () => {
    it('opens the shared viewer by click and keyboard, navigates, and restores focus', async () => {
        const user = userEvent.setup()
        const onOpenModal = vi.fn()
        render(details({ onOpenModal }))
        const thumbnail = await screen.findByRole('button', { name: `View images of ${item.name}` })
        expect(within(thumbnail).getByRole('img')).toHaveAttribute('src', images[0].src)
        await user.click(thumbnail)
        let viewer = screen.getByRole('dialog', { name: `${item.name} images` })
        expect(within(viewer).getByText(/First artist/)).toBeInTheDocument()
        await user.click(within(viewer).getByRole('button', { name: 'Next image' }))
        expect(within(viewer).getByRole('img')).toHaveAttribute('src', images[1].src)
        await user.keyboard('{ArrowLeft}')
        expect(within(viewer).getByRole('img')).toHaveAttribute('src', images[0].src)
        await user.keyboard('{Escape}')
        await waitFor(() => expect(thumbnail).toHaveFocus())
        await user.keyboard('{Enter}')
        viewer = screen.getByRole('dialog', { name: `${item.name} images` })
        await user.click(within(viewer).getByRole('button', { name: 'Close image viewer' }))
        await waitFor(() => expect(thumbnail).toHaveFocus())
        expect(onOpenModal).not.toHaveBeenCalled()
    })

    it.each(['missing', 'rejected'] as const)('keeps the emoji when artwork is %s', async (reason) => {
        if (reason === 'missing') vi.mocked(getItemImages).mockResolvedValue([])
        else vi.mocked(getItemImages).mockRejectedValue(new Error('Unavailable'))
        const { container } = render(details())
        await act(async () => {})
        expect(container.querySelector('.item-icon-tile')).toHaveTextContent(item.icon)
        expect(screen.queryByRole('button', { name: /View images of/ })).not.toBeInTheDocument()
    })

    it('returns to the emoji when the thumbnail fails and resets for another item', async () => {
        const { container, rerender } = render(details())
        const thumbnail = await screen.findByRole('button', { name: /View images of/ })
        fireEvent.error(within(thumbnail).getByRole('img'))
        expect(container.querySelector('.item-icon-tile')).toHaveTextContent(item.icon)
        expect(screen.queryByRole('button', { name: /View images of/ })).not.toBeInTheDocument()
        rerender(details({ item: ITEM_FIXTURES[1] }))
        expect(await screen.findByRole('button', { name: `View images of ${ITEM_FIXTURES[1].name}` })).toBeInTheDocument()
    })

    it('shows the emoji while loading and ignores requests from a previous selection', async () => {
        let resolveFirst!: (value: ItemImage[]) => void
        let resolveSecond!: (value: ItemImage[]) => void
        vi.mocked(getItemImages)
            .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
            .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))
        const { container, rerender } = render(details())
        expect(container.querySelector('.item-icon-tile')).toHaveTextContent(item.icon)
        rerender(details({ item: ITEM_FIXTURES[1] }))
        await act(async () => { resolveSecond([images[1]]) })
        await act(async () => { resolveFirst([images[0]]) })
        expect(screen.getByRole('img', { name: ITEM_FIXTURES[1].name })).toHaveAttribute('src', images[1].src)
    })

    it('uses resolved group and variant artwork and closes the viewer on selection changes', async () => {
        const user = userEvent.setup()
        const resolvedItem: Item = { ...ITEM_FIXTURES[2], imageFallback: { name: 'Generic weapon', source: 'DMG' } }
        const base: VariantBaseOption = {
            id: 'base', baseItemId: 'sword', baseName: 'Sword', baseSource: 'DMG',
            basePriceGp: 10, variantPriceGp: null, effectivePriceGp: 10, resolvedItem,
        }
        const group: ItemGroupOption = {
            id: 'version', label: 'Version', source: 'DMG', kind: 'member', rarityOrigin: 'explicit',
            resolvedItem: { ...ITEM_FIXTURES[1], variantOptions: [base] },
        }
        const groupedItem = { ...item, groupOptions: [group] }
        const { rerender } = render(details({ item: groupedItem }))
        await user.click(await screen.findByRole('button', { name: `View images of ${item.name}` }))
        rerender(details({ item: groupedItem, selectedGroupOption: group }))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        await screen.findByRole('button', { name: `View images of ${group.resolvedItem.name}` })
        expect(getItemImages).toHaveBeenLastCalledWith(group.resolvedItem.name, group.resolvedItem.source, undefined)
        rerender(details({ item: groupedItem, selectedGroupOption: group, selectedVariantOption: base }))
        await screen.findByRole('button', { name: `View images of ${resolvedItem.name}` })
        expect(getItemImages).toHaveBeenLastCalledWith(resolvedItem.name, resolvedItem.source, resolvedItem.imageFallback)
    })
})
