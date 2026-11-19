import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeAll, beforeEach } from 'vitest'
import { loadCatalogNames, loadCatalogTexts } from '@/features/catalog/model/item-translations'
import names from '@/features/catalog/data/translations/pt-BR/items.json'
import texts from '@/features/catalog/data/translations/pt-BR/item-texts.json'
import shared from '@/features/catalog/data/translations/pt-BR/shared-texts.json'

// Existing presentation tests exercise an already-loaded catalog. Loader tests
// import a fresh module to cover the unloaded and failure states separately.
beforeAll(async () => {
    const resources: Record<string, unknown> = { 'items.json': names, 'item-texts.json': texts, 'shared-texts.json': shared }
    const fetcher: typeof fetch = async (input) => new Response(JSON.stringify(resources[new URL(String(input)).pathname.split('/').at(-1) ?? '']))
    await Promise.all([loadCatalogNames(fetcher), loadCatalogTexts(fetcher)])
})

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: new IDBFactory(),
  })
})

afterEach(() => cleanup())
