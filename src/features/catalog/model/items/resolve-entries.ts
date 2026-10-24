import { buildEntityIndex, entityKey } from './indexes'
import type { ItemDescriptionBlock } from '../../types/catalog'
import type { JsonRecord, RawItemEntry } from './raw-types'
import { isJsonRecord } from './raw-types'

function templateValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(templateValue).filter(Boolean).join(', ')
  if (isJsonRecord(value)) return Object.entries(value).map(([key, entry]) => `${key}: ${templateValue(entry)}`).join(', ')
  return String(value)
}

export function interpolateItemTemplate(value: string, entity: JsonRecord): string {
  return value
    .replace(/\{\{(?:getFullImmRes\s+)?item\.([A-Za-z][A-Za-z0-9_]*)\}\}/g, (_match, field: string) => templateValue(entity[field]))
    .replace(/\{=([A-Za-z][A-Za-z0-9_]*)\}/g, (_match, field: string) => templateValue(entity[field]))
    .replace(/\{\{prop_name(_lower)?\}\}/g, '')
}

function splitTopLevelPipes(payload: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < payload.length; index++) {
    if (payload[index] === '{') depth++
    else if (payload[index] === '}') depth--
    else if (payload[index] === '|' && depth === 0) {
      parts.push(payload.slice(start, index))
      start = index + 1
    }
  }
  parts.push(payload.slice(start))
  return parts
}

function visibleTagText(tag: string, payload: string): string {
  const parts = splitTopLevelPipes(payload).map((part) => cleanInlineTags(part.trim()))
  const first = parts[0] ?? ''
  const explicitDisplay = parts[2] || first
  switch (tag.toLowerCase()) {
    case 'dc': return `DC ${first}`
    case 'chance': return `${first}% chance`
    case 'recharge': return first ? `Recharge ${first}` : 'Recharge'
    case 'item':
    case 'spell':
    case 'creature':
    case 'condition':
    case 'disease':
    case 'skill':
    case 'action':
    case 'variantrule':
    case 'status':
    case 'sense':
      return explicitDisplay
    default:
      return first
  }
}

export function cleanInlineTags(value: string): string {
  let output = ''
  let cursor = 0
  while (cursor < value.length) {
    const start = value.indexOf('{@', cursor)
    if (start < 0) {
      output += value.slice(cursor)
      break
    }
    output += value.slice(cursor, start)
    let depth = 0
    let end = -1
    for (let index = start; index < value.length; index++) {
      if (value[index] === '{') depth++
      if (value[index] === '}') {
        depth--
        if (depth === 0) {
          end = index
          break
        }
      }
    }
    if (end < 0) {
      output += value.slice(start)
      break
    }
    const content = value.slice(start + 2, end)
    const separator = content.search(/\s/)
    const tag = separator < 0 ? content : content.slice(0, separator)
    const payload = separator < 0 ? '' : content.slice(separator + 1)
    output += visibleTagText(tag, payload)
    cursor = end + 1
  }
  return output
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

function renderTable(value: JsonRecord, entity: JsonRecord, itemEntries: ReadonlyMap<string, RawItemEntry>, stack: Set<string>): ItemDescriptionBlock {
    const caption = typeof value.caption === 'string' ? cleanInlineTags(interpolateItemTemplate(value.caption, entity)) : undefined
    const columns = Array.isArray(value.colLabels)
        ? value.colLabels.map((cell) => renderEntryTree(cell, entity, itemEntries, stack).join(' '))
        : []
    const rows = Array.isArray(value.rows)
        ? value.rows.map((row) => (Array.isArray(row) ? row : [row]).map((cell) => renderEntryTree(cell, entity, itemEntries, stack).join(' ')))
        : []
    return { type: 'table', caption: caption || undefined, columns, rows }
}

export function entryBlockLines(block: ItemDescriptionBlock): string[] {
    if (block.type === 'paragraph') return [block.text]
    return [
        block.caption,
        block.columns.filter(Boolean).join(' — '),
        ...block.rows.map((row) => row.filter(Boolean).join(' — ')),
    ].filter((line): line is string => Boolean(line))
}

function resolveItemEntryReference(reference: string, entity: JsonRecord, itemEntries: ReadonlyMap<string, RawItemEntry>, stack: Set<string>): ItemDescriptionBlock[] {
  const [name, explicitSource] = reference.split('|').map((part) => part.trim())
  const entitySource = typeof entity.source === 'string' ? entity.source : undefined
  const sources = [explicitSource, entitySource, 'DMG'].filter((source): source is string => Boolean(source))
  let itemEntry: RawItemEntry | undefined
  for (const source of sources) {
    itemEntry = itemEntries.get(entityKey(name, source))
    if (itemEntry) break
  }
  if (!itemEntry && !explicitSource) {
    const matches = [...itemEntries.entries()].filter(([key]) => key.startsWith(`${name.toLocaleLowerCase('en-US')}|`))
    if (matches.length === 1) itemEntry = matches[0][1]
  }
  if (!itemEntry) throw new Error(`${entity.name ?? 'Item'}|${entity.source ?? '?'}: unresolved itemEntry ${reference}`)
  const key = entityKey(itemEntry.name, itemEntry.source)
  if (stack.has(key)) throw new Error(`${entity.name ?? 'Item'}|${entity.source ?? '?'}: recursive itemEntry ${reference}`)
  stack.add(key)
  const blocks = renderEntryBlocks(itemEntry.entriesTemplate, entity, itemEntries, stack)
  stack.delete(key)
  return blocks
}

export function renderEntryBlocks(
  value: unknown,
  entity: JsonRecord = {},
  itemEntries: ReadonlyMap<string, RawItemEntry> = new Map(),
  stack = new Set<string>(),
): ItemDescriptionBlock[] {
  if (value == null) return []
  if (typeof value === 'string') {
    const itemEntryMatch = /^\s*\{#itemEntry\s+([^}]+)\}\s*$/.exec(value)
    if (itemEntryMatch) return resolveItemEntryReference(itemEntryMatch[1], entity, itemEntries, stack)
    const text = cleanInlineTags(interpolateItemTemplate(value, entity))
    return text ? [{ type: 'paragraph', text }] : []
  }
  if (typeof value === 'number' || typeof value === 'boolean') return [{ type: 'paragraph', text: String(value) }]
  if (Array.isArray(value)) return value.flatMap((entry) => renderEntryBlocks(entry, entity, itemEntries, stack))
  if (!isJsonRecord(value)) return [{ type: 'paragraph', text: String(value) }]

  if (value.type === 'table' || Array.isArray(value.rows)) return [renderTable(value, entity, itemEntries, stack)]

  const body = value.entries ?? value.items ?? value.entry
  const bodyBlocks = renderEntryBlocks(body, entity, itemEntries, stack)
  const name = typeof value.name === 'string' ? cleanInlineTags(interpolateItemTemplate(value.name, entity)) : ''
  if (name && bodyBlocks.length) {
    const first = bodyBlocks[0]
    return first.type === 'paragraph'
        ? [{ type: 'paragraph', text: `${name}: ${first.text}` }, ...bodyBlocks.slice(1)]
        : [{ type: 'paragraph', text: name }, ...bodyBlocks]
  }
  if (name) return [{ type: 'paragraph', text: name }]
  if (bodyBlocks.length) return bodyBlocks

  const scalarSummary = Object.entries(value)
    .filter(([key, entry]) => !['type', 'style', 'page', 'colStyles'].includes(key) && (typeof entry === 'string' || typeof entry === 'number'))
    .map(([key, entry]) => `${key}: ${cleanInlineTags(interpolateItemTemplate(String(entry), entity))}`)
    .join('; ')
  if (scalarSummary) return [{ type: 'paragraph', text: scalarSummary }]
  return [{ type: 'paragraph', text: value.type ? `[${String(value.type)}]` : '[Unstructured entry]' }]
}

export function renderEntryTree(
  value: unknown,
  entity: JsonRecord = {},
  itemEntries: ReadonlyMap<string, RawItemEntry> = new Map(),
  stack = new Set<string>(),
): string[] {
  return renderEntryBlocks(value, entity, itemEntries, stack).flatMap(entryBlockLines)
}

export function createItemEntryIndex(entries: readonly RawItemEntry[]): Map<string, RawItemEntry> {
  return buildEntityIndex(entries)
}

export function resolveEntityEntries(entity: JsonRecord, itemEntries: ReadonlyMap<string, RawItemEntry>): string[] {
  return resolveEntityEntryBlocks(entity, itemEntries)
    .flatMap(entryBlockLines)
    .filter((line, index, lines) => line && lines.indexOf(line) === index)
}

export function resolveEntityEntryBlocks(entity: JsonRecord, itemEntries: ReadonlyMap<string, RawItemEntry>): ItemDescriptionBlock[] {
  return [
    ...renderEntryBlocks(entity.entries, entity, itemEntries),
    ...renderEntryBlocks(entity.additionalEntries, entity, itemEntries),
  ]
}
