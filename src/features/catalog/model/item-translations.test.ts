import { beforeAll, describe, expect, it } from 'vitest'
import itemsJson from '../data/items.json'
import baseJson from '../data/items-base.json'
import variantsJson from '../data/magicvariants.json'
import { buildCatalog } from './items/build-catalog'
import type { ItemJsonFiles } from './items/raw-types'
import type { Item } from '../types'
import { catalogTranslations, configurationName, groupOptionName, itemName, itemText, presentItem } from './item-translations'
import { EMPTY_FILTERS, filterAndSortItems } from './filtering'
import { tableMeasurementUnit, tokenizeMeasurements } from '@/features/measurements/model/tokenize'
import { getCatalogTextFields, isPreservedCatalogText } from './translation-coverage'
import { calculatePricing, DEFAULT_MODIFIERS } from './pricing'

let catalog: Item[]
const allItems = new Map<string, Item>()
const knownIds = new Set<string>()

function texts(item: Item): string[] {
    return [
        item.description, item.subtype, item.attunementRequirement ?? '', ...item.properties, ...(item.characteristics ?? []),
        ...[item.weaponInformation, item.armorInformation, item.vehicleInformation, item.mountInformation, item.spellcastingFocusInformation].flatMap((entries) => entries?.map((entry) => entry.value) ?? []),
        ...(item.descriptionBlocks ?? []).flatMap((block) => block.type === 'paragraph' ? [block.text] : [block.caption ?? '', ...block.columns, ...block.rows.flat()]),
    ]
}

beforeAll(() => {
    catalog = buildCatalog({ items: itemsJson, base: baseJson, variants: variantsJson } as unknown as ItemJsonFiles)
    const visit = (item: Item) => {
        if (allItems.has(item.id)) return
        allItems.set(item.id, item)
        knownIds.add(item.id)
        item.groupOptions?.forEach((option) => visit(option.resolvedItem))
        item.variantOptions?.forEach((option) => { knownIds.add(option.baseItemId); visit(option.resolvedItem) })
    }
    catalog.forEach(visit)
})

describe('catalog presentation translations', () => {
    it('presents Warcraft names, copied text and grouped options in Portuguese', () => {
        const feather = allItems.get('item--wow--aviana-s-feather')!
        expect(itemName(feather, 'pt-BR')).toBe('Pena de Aviana')
        expect(filterAndSortItems([feather], { ...EMPTY_FILTERS, search: 'pena de aviana' }, 'name', 'asc', 'pt-BR')).toEqual([feather])
        const ring = allItems.get('item--icc--ashen-band-of-unmatched-destruction')!
        expect(itemName(ring, 'pt-BR')).toBe('Anel Cinéreo da Destruição Inigualável')
        const apparatus = presentItem(allItems.get('item--wow--steamwheedle-apparatus')!, 'pt-BR')
        expect(apparatus.descriptionBlocks).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'table', caption: 'Alavancas do Dispositivo de Steamwheedle' }),
        ]))
        const mana = allItems.get('itemgroup--wow--potions-of-mana')!
        expect(mana.groupOptions?.map((option) => groupOptionName(option, 'pt-BR'))).toEqual(['Poção de Mana', 'Poção de Mana (Maior)', 'Poção de Mana (Superior)'])
        expect(itemText(allItems.get('item--wow--helm-of-domination')!, 'Toll the Dead', 'pt-BR')).toBe('Badalar Fúnebre')
    })

    it('uses stable IDs and field fallback without sharing names across sources', () => {
        const item = allItems.get('item--phb--backpack')!
        expect(itemName(item, 'pt-BR')).toBe('Mochila')
        expect(itemName(item, 'en-US')).toBe('Backpack')
        expect(itemName({ ...item, id: 'item--untranslated-source--backpack' }, 'pt-BR')).toBe('Backpack')
        expect(itemText(item, 'A revised paragraph.', 'pt-BR')).toBe('A revised paragraph.')
    })

    it('preserves original data, selection objects and pricing', () => {
        const item = catalog.find((entry) => entry.variantOptions?.length)!
        const before = JSON.stringify(item)
        const display = presentItem(item, 'pt-BR')
        expect(JSON.stringify(item)).toBe(before)
        expect(display.variantOptions).toBe(item.variantOptions)
        expect(calculatePricing(display, DEFAULT_MODIFIERS, null)).toEqual(calculatePricing(item, DEFAULT_MODIFIERS, null))
        expect(presentItem(item, 'en-US')).toBe(item)
    })

    it('searches both languages and accents independently of the selected language', () => {
        const item = allItems.get('item--phb--abacus')!
        for (const language of ['pt-BR', 'en-US']) {
            for (const search of ['ábaco', 'ABACO', 'Abacus']) {
                expect(filterAndSortItems([item], { ...EMPTY_FILTERS, search }, 'name', 'asc', language)).toEqual([item])
            }
        }
    })

    it('sorts by displayed names and finds translated base options', () => {
        const items = ['item--phb--backpack', 'item--phb--abacus', 'item--dmg--alchemy-jug'].map((id) => allItems.get(id)!)
        const sorted = filterAndSortItems(items, EMPTY_FILTERS, 'name', 'asc', 'pt-BR')
        expect(sorted.map((item) => itemName(item, 'pt-BR'))).toEqual(['Ábaco', 'Jarro Alquímico', 'Mochila'])
        const family = catalog.find((item) => item.variantOptions?.some((option) => option.baseName === 'Antimatter Rifle'))!
        expect(filterAndSortItems([family], { ...EMPTY_FILTERS, search: 'rifle de antimateria' }, 'name', 'asc', 'pt-BR')).toEqual([family])
        expect(filterAndSortItems([{ ...family, variantOptions: [] }], { ...EMPTY_FILTERS, search: 'rifle de antimateria' }, 'name', 'asc', 'pt-BR')).toEqual([])
    })

    it('uses localized names to break ties in every sort mode and stable IDs for equal names', () => {
        const items = ['baseitem--phb--club', 'baseitem--phb--dagger'].map((id) => ({ ...allItems.get(id)!, basePriceGp: 100 }))
        for (const key of ['type', 'category', 'rarity', 'price'] as const) {
            expect(filterAndSortItems(items, EMPTY_FILTERS, key, 'asc', 'en-US').map((item) => item.name)).toEqual(['Club', 'Dagger'])
            expect(filterAndSortItems(items, EMPTY_FILTERS, key, 'asc', 'pt-BR').map((item) => itemName(item, 'pt-BR'))).toEqual(['Adaga', 'Clava'])
            expect(filterAndSortItems(items, EMPTY_FILTERS, key, 'desc', 'pt-BR').map((item) => itemName(item, 'pt-BR'))).toEqual(['Clava', 'Adaga'])
        }
        const equalNames = [{ ...items[0], id: 'z' }, { ...items[0], id: 'a' }]
        expect(filterAndSortItems(equalNames, EMPTY_FILTERS, 'price', 'asc').map((item) => item.id)).toEqual(['a', 'z'])
    })

    it('keeps inferred initial stages explicit and builds translated configuration labels', () => {
        const item = allItems.get('item--phb--backpack')!
        const option = { id: 'initial', label: 'Initial', source: 'PHB', kind: 'inferredInitialStage' as const, rarityOrigin: 'inferred' as const, resolvedItem: item }
        expect(groupOptionName(option, 'pt-BR')).toBe('Inicial')
        expect(configurationName(option, undefined, 'pt-BR')).toBe('Inicial')
        expect(groupOptionName(option, 'en-US')).toBe('Initial')
    })

    it('translates an ambiguous spell name as a spell rather than an adverb', () => {
        const item = allItems.get('item--dmg--wand-of-wonder')!
        expect(itemText(item, 'You cast slow.', 'pt-BR')).toBe('Você conjura lentidão.')
        expect(itemText(item, 'You cast slow.', 'en-US')).toBe('You cast slow.')
    })

    it('preserves table shape, numeric cells and edition-specific rules', () => {
        for (const source of ['dmg', 'xdmg']) {
            const item = allItems.get(`item--${source}--alchemy-jug`)!
            const original = item.descriptionBlocks!.find((block) => block.type === 'table')!
            const translated = presentItem(item, 'pt-BR').descriptionBlocks!.find((block) => block.type === 'table')!
            expect(translated.columns).toEqual(['Líquido', 'Quantidade Máxima'])
            expect(translated.rows.map((row) => row.length)).toEqual(original.rows.map((row) => row.length))
            expect(translated.rows.map((row) => row[1])).toEqual(original.rows.map((row) => row[1]))
            expect(translated.rows[1]).toEqual(['Veneno Básico', source === 'dmg' ? '½ ounce' : '4 ounces'])
        }
    })

    it('covers every visible text field and preserves measurement units in every table heading', () => {
        const pending: string[] = []
        for (const item of allItems.values()) {
            for (const { field, text } of getCatalogTextFields(item)) {
                if (!isPreservedCatalogText(text) && !catalogTranslations.items[item.id]?.texts?.[text] && !catalogTranslations.shared[text]) pending.push(`${item.id}: ${field}: ${text}`)
            }
            const translated = presentItem(item, 'pt-BR')
            item.descriptionBlocks?.forEach((block, index) => {
                if (block.type !== 'table') return
                const display = translated.descriptionBlocks?.[index]
                expect(display?.type).toBe('table')
                if (display?.type !== 'table') return
                expect(display.rows.map((row) => row.length)).toEqual(block.rows.map((row) => row.length))
                expect(display.columns.length).toBe(block.columns.length)
                block.columns.forEach((column, columnIndex) => {
                    expect(tableMeasurementUnit(display.columns[columnIndex]), `${item.id}: ${column}`).toEqual(tableMeasurementUnit(column))
                })
            })
        }
        expect(pending).toEqual([])
    })

    it('validates every resource ID, source passage, number, die and measurement', () => {
        for (const id of knownIds) expect(catalogTranslations.items[id]?.name, `Missing name: ${id}`).toBeTruthy()
        const originalTexts = new Set([...allItems.values()].flatMap(texts))
        const pairs: [string, string][] = Object.entries(catalogTranslations.shared)
        for (const [id, translation] of Object.entries(catalogTranslations.items)) {
            expect(knownIds.has(id), `Unknown ID: ${id}`).toBe(true)
            expect(translation.name?.trim() !== '', `Empty name: ${id}`).toBe(true)
            const originals = new Set(allItems.has(id) ? texts(allItems.get(id)!) : [])
            for (const [source, translated] of Object.entries(translation.texts ?? {})) {
                expect(originals.has(source), `Stale text: ${id}: ${source}`).toBe(true)
                pairs.push([source, translated])
            }
        }
        for (const [source, translated] of pairs) {
            expect(originalTexts.has(source), `Unused text: ${source}`).toBe(true)
            expect(translated.trim(), source).not.toBe('')
            expect(translated, source).not.toMatch(/ZXQ|INVALID_MARKER|\uFFFD/)
            if (!source.includes('?')) expect(translated, source).not.toMatch(/[\p{L}]\?+[\p{L}]/u)
            const numbers = (text: string) => (text.match(/[+-]?\d+(?:[.,]\d+)*(?:d\d+)?/g) ?? []).sort()
            expect(numbers(translated), source).toEqual(numbers(source))
            const measurements = (text: string) => tokenizeMeasurements(text, source).filter((token) => typeof token !== 'string')
            expect(measurements(translated), source).toEqual(measurements(source))
        }
    })
})
