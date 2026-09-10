import type { JsonRecord } from './raw-types'

export interface ParsedUid {
  name: string
  source?: string
  original: string
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('en-US')

export function parseUid(value: string): ParsedUid {
  const [name = '', source] = value.split('|')
  if (!name.trim()) throw new Error(`Invalid empty UID: "${value}"`)
  return { name: name.trim(), source: source?.trim() || undefined, original: value }
}

export function entityKey(name: string, source: string): string {
  return `${normalize(name)}|${normalize(source)}`
}

export function buildEntityIndex<T extends JsonRecord>(entities: readonly T[], nameField: keyof T = 'name'): Map<string, T> {
  const index = new Map<string, T>()
  for (const entity of entities) {
    const name = entity[nameField]
    const source = entity.source
    if (typeof name !== 'string' || typeof source !== 'string') throw new Error(`Cannot index entity without ${String(nameField)} and source`)
    const key = entityKey(name, source)
    if (index.has(key)) throw new Error(`Duplicate entity key: ${name}|${source}`)
    index.set(key, entity)
  }
  return index
}

export function lookupUid<T extends JsonRecord>(
  index: ReadonlyMap<string, T>,
  uid: string,
  options: { defaultSource?: string; fallbackSources?: readonly string[] } = {},
): T | undefined {
  const parsed = parseUid(uid)
  const sources = parsed.source
    ? [parsed.source]
    : [options.defaultSource, ...(options.fallbackSources ?? [])].filter((source): source is string => Boolean(source))
  for (const source of sources) {
    const found = index.get(entityKey(parsed.name, source))
    if (found) return found
  }
  if (!parsed.source) {
    const matches = [...index.entries()].filter(([key]) => key.startsWith(`${normalize(parsed.name)}|`))
    if (matches.length === 1) return matches[0][1]
  }
  return undefined
}
