import adventures from '../data/adventures.json'
import books from '../data/books.json'

export type SourceEdition = '5.5e' | '5e'

export const SOURCE_GROUPS = ['core', 'setting', 'setting-alt', 'supplement', 'supplement-alt'] as const

export type SourceGroup = typeof SOURCE_GROUPS[number]

export interface SourceDefinition {
  source: string
  name: string
  published?: string
  edition: SourceEdition
  group: SourceGroup
}

interface SourceEntry {
  group: string
  id: string
  name: string
  source: string
  published: string
}

const EDITION_CUTOFF = '2024-09-16'

const SUPPLEMENTAL_5E_SOURCES = [
  { source: 'EET', name: 'Elemental Evil Trinkets' },
  { source: 'HAT-LMI', name: 'Honor Among Thieves: Legendary Magic Items' },
  { source: 'MCV2DC', name: 'Monstrous Compendium Volume 2: Dragonlance Creatures' },
  { source: 'RoTOS', name: 'The Rise of Tiamat Online Supplement' },
  { source: 'TftYP', name: 'Tales from the Yawning Portal' },
] as const

const SOURCE_GROUP_SET: ReadonlySet<string> = new Set(SOURCE_GROUPS)

export function normalizeSource(source: string): string {
  return source.trim().toLocaleUpperCase('en-US')
}

function isSourceGroup(group: string): group is SourceGroup {
  return SOURCE_GROUP_SET.has(group)
}

function createSourceRegistry(entries: SourceEntry[]): {
  definitions: readonly SourceDefinition[]
  names: ReadonlyMap<string, string>
} {
  const definitionsBySource = new Map<string, SourceDefinition>()
  const names = new Map<string, string>()

  for (const { group, id, name, published, source } of entries) {
    for (const key of [source, id]) {
      const normalizedKey = normalizeSource(key)
      if (!names.has(normalizedKey)) names.set(normalizedKey, name)
    }

    if (!isSourceGroup(group)) continue

    const normalizedSource = normalizeSource(source)
    if (!definitionsBySource.has(normalizedSource)) {
      definitionsBySource.set(normalizedSource, {
        source,
        name,
        published,
        edition: published > EDITION_CUTOFF ? '5.5e' : '5e',
        group,
      })
    }
  }

  for (const { source, name } of SUPPLEMENTAL_5E_SOURCES) {
    const normalizedSource = normalizeSource(source)
    names.set(normalizedSource, name)
    definitionsBySource.set(normalizedSource, { source, name, edition: '5e', group: 'supplement' })
  }

  const definitions = [...definitionsBySource.values()].sort((left, right) => {
    const publishedComparison = (left.published ?? '\uffff').localeCompare(right.published ?? '\uffff')
    return publishedComparison || left.source.localeCompare(right.source, 'en-US', { sensitivity: 'base' })
  })

  return { definitions, names }
}

const SOURCE_REGISTRY = createSourceRegistry([...books.book, ...adventures.adventure])

export const SOURCE_DEFINITIONS = SOURCE_REGISTRY.definitions
export const ALL_SOURCE_CODES = SOURCE_DEFINITIONS.map(({ source }) => source)
export const SOURCES_BY_EDITION: Readonly<Record<SourceEdition, readonly SourceDefinition[]>> = {
  '5.5e': SOURCE_DEFINITIONS.filter(({ edition }) => edition === '5.5e'),
  '5e': SOURCE_DEFINITIONS.filter(({ edition }) => edition === '5e'),
}

export function getSourceName(source: string): string | undefined {
  return SOURCE_REGISTRY.names.get(normalizeSource(source))
}
