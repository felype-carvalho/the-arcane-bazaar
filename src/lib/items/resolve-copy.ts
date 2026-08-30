import { buildEntityIndex, entityKey } from './indexes'
import type { JsonRecord, RawCopy } from './raw-types'
import { isJsonRecord } from './raw-types'

type CopyableEntity = JsonRecord & { name?: string; source?: string; abbreviation?: string; _copy?: RawCopy }

const clone = <T>(value: T): T => structuredClone(value)

function normalizeItems(items: unknown): unknown[] {
  return Array.isArray(items) ? clone(items) : [clone(items)]
}

function matchesReplacement(value: unknown, replace: JsonRecord): boolean {
  if ('value' in replace) return Object.is(value, replace.value)
  if ('name' in replace) return isJsonRecord(value) && value.name === replace.name
  if ('regex' in replace && typeof replace.regex === 'string') return new RegExp(replace.regex).test(typeof value === 'string' ? value : JSON.stringify(value))
  return false
}

function applyModification(entity: CopyableEntity, field: string, operation: unknown, context: string): void {
  if (!isJsonRecord(operation) || typeof operation.mode !== 'string') throw new Error(`${context}: invalid _mod operation for ${field}`)
  const existing = entity[field]
  if (existing !== undefined && !Array.isArray(existing)) throw new Error(`${context}: _mod target ${field} is not an array`)
  const current: unknown[] = Array.isArray(existing) ? existing : []
  if (existing === undefined) entity[field] = current
  const items = normalizeItems(operation.items)

  switch (operation.mode) {
    case 'appendArr':
      current.push(...items)
      return
    case 'insertArr': {
      if (typeof operation.index !== 'number' || !Number.isInteger(operation.index)) throw new Error(`${context}: insertArr requires an integer index`)
      const index = operation.index < 0 ? current.length : operation.index
      current.splice(index, 0, ...items)
      return
    }
    case 'replaceArr': {
      if (!isJsonRecord(operation.replace)) throw new Error(`${context}: replaceArr requires a replace selector`)
      const selector = operation.replace
      let index = typeof selector.index === 'number' && Number.isInteger(selector.index)
        ? selector.index
        : current.findIndex((value) => matchesReplacement(value, selector))
      if (index < 0) index = current.length + index
      if (index < 0 || index >= current.length) throw new Error(`${context}: replaceArr target was not found in ${field}`)
      current.splice(index, 1, ...items)
      return
    }
    default:
      throw new Error(`${context}: unsupported _mod mode "${operation.mode}"`)
  }
}

export function resolveCopies<T extends CopyableEntity>(
  entities: readonly T[],
  options: { identityField?: 'name' | 'abbreviation'; collectionName?: string } = {},
): T[] {
  const identityField = options.identityField ?? 'name'
  const collectionName = options.collectionName ?? 'collection'
  const index = buildEntityIndex(entities as T[], identityField)
  const resolved = new Map<string, T>()
  const resolving = new Set<string>()

  const resolve = (entity: T): T => {
    const identity = entity[identityField]
    if (typeof identity !== 'string' || typeof entity.source !== 'string') throw new Error(`${collectionName}: entity lacks ${identityField} or source`)
    const key = entityKey(identity, entity.source)
    const cached = resolved.get(key)
    if (cached) return clone(cached)
    if (resolving.has(key)) throw new Error(`${collectionName}: _copy cycle detected at ${identity}|${entity.source}`)
    resolving.add(key)

    let output: T
    if (!entity._copy) {
      output = clone(entity)
    } else {
      const copy = entity._copy
      const parentIdentity = identityField === 'abbreviation' ? copy.abbreviation : copy.name
      if (typeof parentIdentity !== 'string' || typeof copy.source !== 'string') throw new Error(`${collectionName}: ${identity}|${entity.source} has an invalid _copy reference`)
      const parent = index.get(entityKey(parentIdentity, copy.source))
      if (!parent) throw new Error(`${collectionName}: missing _copy parent ${parentIdentity}|${copy.source} for ${identity}|${entity.source}`)
      output = resolve(parent)
      const child = clone(entity)
      delete child._copy
      Object.assign(output, child)

      if (copy._mod) {
        for (const [field, value] of Object.entries(copy._mod)) {
          for (const operation of Array.isArray(value) ? value : [value]) {
            applyModification(output, field, operation, `${collectionName}: ${identity}|${entity.source}`)
          }
        }
      }
      delete output._copy
    }

    resolving.delete(key)
    resolved.set(key, clone(output))
    return output
  }

  return entities.map(resolve)
}
