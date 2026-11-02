import { render, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import items from '@/features/catalog/data/items.json'
import base from '@/features/catalog/data/items-base.json'
import variants from '@/features/catalog/data/magicvariants.json'
import { buildCatalog } from '@/features/catalog/model/items/build-catalog'
import type { ItemJsonFiles } from '@/features/catalog/model/items/raw-types'
import type { Item } from '@/features/catalog/types'
import { ItemModal } from '@/features/catalog/components/item/ItemModal'
import { MeasurementProvider } from './MeasurementProvider'
import { defaultMeasurements } from './preferences'

describe('measurements in real catalog items', () => {
    let catalog: Item[]
    beforeAll(() => { catalog = buildCatalog({ items, base, variants } as unknown as ItemJsonFiles) })

    it.each([
        ['Riding Horse', 'PHB', ['18 m (12)', '217.7 kg']],
        ['Longbow', 'PHB', ['45/180 m (30/120)', '0.9 kg']],
        ['Bag of Holding', 'DMG', ['6.8 kg', '226.8 kg', '1.7 m³']],
        ['Alchemy Jug', 'DMG', ['236.6 ml', '14.8 ml', '946.4 ml']],
        ['Barrel', 'PHB', ['151.4 L', '0.1 m³']],
        ['Galley', 'DMG', ['6.4 km/h']],
    ])('converts %s fields and descriptions without changing its source', (name, source, expected) => {
        const item = catalog.find((candidate) => candidate.name === name && candidate.source === source)!
        expect(item).toBeDefined()
        const before = JSON.stringify(item)
        render(<MeasurementProvider preferences={defaultMeasurements('pt-BR')}><ItemModal item={item} onClose={vi.fn()} /></MeasurementProvider>)
        const dialog = screen.getByRole('dialog', { name })
        for (const text of expected) expect(within(dialog).getAllByRole('button', { name: text }).length).toBeGreaterThan(0)
        if (name === 'Galley') expect(dialog).toHaveTextContent('150 tons cargo')
        expect(JSON.stringify(item)).toBe(before)
    })
})
