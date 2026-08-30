import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadItemJsonFiles, resetItemJsonCacheForTests } from './load-json'

const validFiles: Record<string, unknown> = {
  'items.json': { item: [], itemGroup: [] },
  'items-base.json': { baseitem: [], itemProperty: [], itemType: [], itemEntry: [], itemMastery: [] },
  'magicvariants.json': { magicvariant: [] },
}

const fileName = (input: RequestInfo | URL) => new URL(String(input)).pathname.split('/').at(-1) ?? ''

afterEach(() => {
  resetItemJsonCacheForTests()
  vi.restoreAllMocks()
})

describe('JSON item loader', () => {
  it('fetches all assets in parallel and reuses the same promise', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => new Response(JSON.stringify(validFiles[fileName(input)]), { status: 200 }))
    const first = loadItemJsonFiles(fetcher)
    const second = loadItemJsonFiles(fetcher)
    expect(second).toBe(first)
    await expect(first).resolves.toMatchObject({ items: { item: [] }, variants: { magicvariant: [] } })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('includes the file in HTTP, invalid JSON, and schema errors', async () => {
    const httpError = vi.fn<typeof fetch>(async (input) => fileName(input) === 'items.json'
      ? new Response('', { status: 503, statusText: 'Unavailable' })
      : new Response(JSON.stringify(validFiles[fileName(input)]), { status: 200 }))
    await expect(loadItemJsonFiles(httpError)).rejects.toThrow(/items\.json: HTTP 503/i)

    const badJson = vi.fn<typeof fetch>(async (input) => new Response(fileName(input) === 'items.json' ? '{' : JSON.stringify(validFiles[fileName(input)]), { status: 200 }))
    await expect(loadItemJsonFiles(badJson)).rejects.toThrow(/items\.json: invalid JSON/i)

    const badSchema = vi.fn<typeof fetch>(async (input) => new Response(JSON.stringify(fileName(input) === 'items.json' ? { item: [] } : validFiles[fileName(input)]), { status: 200 }))
    await expect(loadItemJsonFiles(badSchema)).rejects.toThrow(/items\.json.*itemGroup/i)
  })
})
