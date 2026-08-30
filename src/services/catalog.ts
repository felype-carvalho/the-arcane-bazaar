import { buildCatalog, type CatalogDiagnostics } from '../lib/items/build-catalog'
import { loadItemJsonFiles, resetItemJsonCacheForTests } from '../lib/items/load-json'
import type { Item } from '../types'

let catalogPromise: Promise<Item[]> | undefined

function reportDiagnostics(diagnostics: CatalogDiagnostics): void {
  if (!import.meta.env.DEV) return
  console.info('[catalog]', {
    total: diagnostics.total,
    byOrigin: diagnostics.byOrigin,
    byCategory: diagnostics.byCategory,
    otherPercent: Number(diagnostics.otherPercent.toFixed(2)),
    unknownTypes: diagnostics.unknownTypes,
  })
}

export function getItems(): Promise<Item[]> {
  catalogPromise ??= loadItemJsonFiles()
    .then((files) => buildCatalog(files, { onDiagnostics: reportDiagnostics }))
    .catch((error) => {
      catalogPromise = undefined
      if (import.meta.env.DEV) console.error('[catalog] Failed to build catalog', error)
      throw error
    })
  return catalogPromise
}

export function resetCatalogCacheForTests(): void {
  catalogPromise = undefined
  resetItemJsonCacheForTests()
}
