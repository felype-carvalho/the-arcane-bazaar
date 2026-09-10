import type { ItemJsonFiles, RawItemsBaseFile, RawItemsFile, RawMagicVariantsFile } from './raw-types'
import { isJsonRecord } from './raw-types'

const SOURCES = {
  items: { name: 'items.json', url: new URL('../../data/items.json', import.meta.url) },
  base: { name: 'items-base.json', url: new URL('../../data/items-base.json', import.meta.url) },
  variants: { name: 'magicvariants.json', url: new URL('../../data/magicvariants.json', import.meta.url) },
} as const

let loadPromise: Promise<ItemJsonFiles> | undefined

function requireArray(root: Record<string, unknown>, property: string, fileName: string): void {
  if (!Array.isArray(root[property])) throw new Error(`${fileName}: required array "${property}" is missing`)
}

export function validateItemsFile(value: unknown, fileName = 'items.json'): RawItemsFile {
  if (!isJsonRecord(value)) throw new Error(`${fileName}: root must be an object`)
  requireArray(value, 'item', fileName)
  requireArray(value, 'itemGroup', fileName)
  return value as RawItemsFile
}

export function validateItemsBaseFile(value: unknown, fileName = 'items-base.json'): RawItemsBaseFile {
  if (!isJsonRecord(value)) throw new Error(`${fileName}: root must be an object`)
  for (const property of ['baseitem', 'itemProperty', 'itemType', 'itemEntry', 'itemMastery']) requireArray(value, property, fileName)
  if (value.itemTypeAdditionalEntries !== undefined) requireArray(value, 'itemTypeAdditionalEntries', fileName)
  return value as RawItemsBaseFile
}

export function validateMagicVariantsFile(value: unknown, fileName = 'magicvariants.json'): RawMagicVariantsFile {
  if (!isJsonRecord(value)) throw new Error(`${fileName}: root must be an object`)
  requireArray(value, 'magicvariant', fileName)
  return value as RawMagicVariantsFile
}

async function fetchJson(fetcher: typeof fetch, source: { name: string; url: URL }): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(source.url)
  } catch (error) {
    throw new Error(`${source.name}: request failed`, { cause: error })
  }
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status} ${response.statusText}`.trim())
  try {
    return await response.json()
  } catch (error) {
    throw new Error(`${source.name}: invalid JSON`, { cause: error })
  }
}

export function loadItemJsonFiles(fetcher: typeof fetch = fetch): Promise<ItemJsonFiles> {
  loadPromise ??= Promise.all([
    fetchJson(fetcher, SOURCES.items),
    fetchJson(fetcher, SOURCES.base),
    fetchJson(fetcher, SOURCES.variants),
  ]).then(([items, base, variants]) => ({
    items: validateItemsFile(items),
    base: validateItemsBaseFile(base),
    variants: validateMagicVariantsFile(variants),
  })).catch((error) => {
    loadPromise = undefined
    throw error
  })
  return loadPromise
}

export function resetItemJsonCacheForTests(): void {
  loadPromise = undefined
}
