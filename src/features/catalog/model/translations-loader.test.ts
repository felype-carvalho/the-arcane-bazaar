import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ITEM_FIXTURES } from '../test/fixtures/items'

beforeEach(() => vi.resetModules())

const resources: Record<string, unknown> = {
    'items.json': { 'item--phb--backpack': { name: 'Mochila' } },
    'item-texts.json': { 'item--phb--backpack': { 'Original text': 'Texto traduzido' } },
    'shared-texts.json': { 'Shared text': 'Texto compartilhado' },
}

function resourceName(input: RequestInfo | URL): string {
    return new URL(String(input)).pathname.split('/').at(-1) ?? ''
}

function createFetcher() {
    return vi.fn<typeof fetch>(async (input) => new Response(JSON.stringify(resources[resourceName(input)])))
}

describe('on-demand catalog translations', () => {
    it('loads names independently of prose and invalidates a previously cached search', async () => {
        const translations = await import('./item-translations')
        const fetcher = createFetcher()
        const item = { ...ITEM_FIXTURES[0], id: 'item--phb--backpack', name: 'Backpack' }
        expect(translations.itemSearchText(item)).not.toContain('mochila')
        expect(translations.catalogTranslations.items).toEqual({})
        const first = translations.loadCatalogNames(fetcher)
        expect(translations.loadCatalogNames(fetcher)).toBe(first)
        await first
        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(translations.itemSearchText(item)).toContain('mochila')
        expect(translations.catalogTranslations.shared).toEqual({})
        expect(translations.areCatalogTextsLoaded()).toBe(false)
        const texts = translations.loadCatalogTexts(fetcher)
        expect(translations.loadCatalogTexts(fetcher)).toBe(texts)
        await texts
        expect(fetcher).toHaveBeenCalledTimes(3)
        expect(translations.areCatalogTextsLoaded()).toBe(true)
        expect(translations.itemText(item, 'Original text', 'pt-BR')).toBe('Texto traduzido')
        expect(translations.loadCatalogNames(fetcher)).toBe(first)
        expect(translations.loadCatalogTexts(fetcher)).toBe(texts)
    })

    it('allows a failed name request to be retried', async () => {
        const translations = await import('./item-translations')
        const fetcher = createFetcher().mockRejectedValueOnce(new Error('Offline'))
        await expect(translations.loadCatalogNames(fetcher)).rejects.toThrow('Offline')
        expect(translations.catalogTranslations.items).toEqual({})
        await translations.loadCatalogNames(fetcher)
        expect(fetcher).toHaveBeenCalledTimes(2)
        expect(translations.catalogTranslations.items['item--phb--backpack'].name).toBe('Mochila')
    })

    it('keeps loaded names and English fallback after a prose failure, then retries atomically', async () => {
        const translations = await import('./item-translations')
        const fetcher = createFetcher()
        await translations.loadCatalogNames(fetcher)
        const offline: typeof fetch = async (input) => resourceName(input) === 'shared-texts.json'
            ? new Response('', { status: 503 }) : fetcher(input)
        await expect(translations.loadCatalogTexts(offline)).rejects.toThrow('HTTP 503')
        expect(translations.areCatalogTextsLoaded()).toBe(false)
        const item = { id: 'item--phb--backpack' }
        expect(translations.itemText(item, 'Original text', 'pt-BR')).toBe('Original text')
        expect(translations.catalogTranslations.items[item.id].name).toBe('Mochila')
        await translations.loadCatalogTexts(fetcher)
        expect(translations.areCatalogTextsLoaded()).toBe(true)
        expect(translations.itemText(item, 'Shared text', 'pt-BR')).toBe('Texto compartilhado')
    })

    it('rejects malformed resources without publishing partial translations', async () => {
        const translations = await import('./item-translations')
        const invalid: typeof fetch = async () => new Response('{"bad":{"name":42}}')
        await expect(translations.loadCatalogNames(invalid)).rejects.toThrow('Invalid catalog translation name')
        expect(translations.catalogTranslations.items).toEqual({})
        const invalidText: typeof fetch = async (input) => new Response(JSON.stringify(resourceName(input) === 'shared-texts.json' ? { text: 42 } : resources['item-texts.json']))
        await expect(translations.loadCatalogTexts(invalidText)).rejects.toThrow('Invalid catalog translation text')
        expect(translations.catalogTranslations.items).toEqual({})
        expect(translations.areCatalogTextsLoaded()).toBe(false)
    })
})
