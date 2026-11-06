import { buildEntityIndex, entityKey } from './indexes'
import type { JsonRecord, RawCopy } from './raw-types'
import { isJsonRecord } from './raw-types'

type CopyableEntity = JsonRecord & { name?: string; source?: string; abbreviation?: string; _copy?: RawCopy }

const clone = <T>(value: T): T => structuredClone(value)

function normalizeItems(items: unknown): unknown[] {
    return Array.isArray(items) ? clone(items) : [clone(items)]
}

function matchesReplacement(value: unknown, replace: unknown): boolean {
    if (typeof replace === 'string') return isJsonRecord(value) ? value.name === replace : value === replace
    if (!isJsonRecord(replace)) return false
    if ('value' in replace) return Object.is(value, replace.value)
    if ('name' in replace) return isJsonRecord(value) && value.name === replace.name
    if ('regex' in replace && typeof replace.regex === 'string') {
        const text = isJsonRecord(value) ? value.name : value
        return typeof text === 'string' && new RegExp(replace.regex, typeof replace.flags === 'string' ? replace.flags : '').test(text)
    }
    return false
}

function replaceText(value: string, expression: RegExp, replacement: string, tagInsensitive: boolean): string {
    if (tagInsensitive) return value.replace(expression, replacement)
    let result = ''
    let cursor = 0
    while (cursor < value.length) {
        const start = value.indexOf('{@', cursor)
        if (start < 0) return result + value.slice(cursor).replace(expression, replacement)
        result += value.slice(cursor, start).replace(expression, replacement)
        let depth = 0
        let end = start
        for (; end < value.length; end++) {
            if (value[end] === '{') depth++
            if (value[end] === '}' && --depth === 0) break
        }
        result += value.slice(start, end + 1)
        cursor = end + 1
    }
    return result
}

function walkText(value: unknown, transform: (text: string) => string): unknown {
    if (typeof value === 'string') return transform(value)
    if (Array.isArray(value)) return value.map((entry) => walkText(entry, transform))
    if (isJsonRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, walkText(entry, transform)]))
    return value
}

function valuesEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true
    if (Array.isArray(left) || Array.isArray(right)) {
        return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => valuesEqual(value, right[index]))
    }
    if (!isJsonRecord(left) || !isJsonRecord(right)) return false
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    return leftKeys.length === rightKeys.length && leftKeys.every((key) => key in right && valuesEqual(left[key], right[key]))
}

function resolveFieldTarget(entity: CopyableEntity, field: string, context: string): { target: JsonRecord; key: string } {
    const path = field.split('.')
    const key = path.pop()
    if (!key || path.some((segment) => !segment)) throw new Error(`${context}: invalid _mod target ${field}`)

    let target: JsonRecord = entity
    for (const segment of path) {
        const next = target[segment]
        if (!isJsonRecord(next)) throw new Error(`${context}: _mod target ${field} has a non-object path segment ${segment}`)
        target = next
    }
    return { target, key }
}

function applyModification(entity: CopyableEntity, field: string, operation: unknown, context: string): void {
    const { target, key } = resolveFieldTarget(entity, field, context)
    if (operation === 'remove') {
        delete target[key]
        return
    }
    if (!isJsonRecord(operation) || typeof operation.mode !== 'string') throw new Error(`${context}: invalid _mod operation for ${field}`)
    if (operation.mode === 'setProp') {
        if (!('value' in operation)) throw new Error(`${context}: setProp requires a value`)
        target[key] = clone(operation.value)
        return
    }

    const existing = target[key]
    if (operation.mode === 'replaceTxt' && existing === undefined) return
    if (existing !== undefined && !Array.isArray(existing)) throw new Error(`${context}: _mod target ${field} is not an array`)
    const current: unknown[] = Array.isArray(existing) ? existing : []
    if (existing === undefined) target[key] = current
    const items = normalizeItems(operation.items)

    switch (operation.mode) {
        case 'replaceTxt': {
            if (typeof operation.replace !== 'string' || typeof operation.with !== 'string') throw new Error(`${context}: replaceTxt requires replace and with strings`)
            const replacement = operation.with
            const flags = typeof operation.flags === 'string' ? operation.flags : ''
            const expression = new RegExp(operation.replace, [...new Set(`g${flags}`)].join(''))
            const props: unknown = operation.props ?? [null, 'entries', 'headerEntries', 'footerEntries']
            if (!Array.isArray(props) || props.some((prop) => prop !== null && typeof prop !== 'string')) throw new Error(`${context}: replaceTxt requires an array of property names or null`)
            const transform = (text: string) => replaceText(text, expression, replacement, operation.tagInsensitive === true)
            target[key] = current.map((entry) => {
                if (typeof entry === 'string') return props.includes(null) ? transform(entry) : entry
                if (!isJsonRecord(entry)) return entry
                for (const prop of props) {
                    if (typeof prop === 'string' && entry[prop] !== undefined) entry[prop] = walkText(entry[prop], transform)
                }
                return entry
            })
            return
        }
        case 'removeArr': {
            const byName = operation.names !== undefined
            const selectors = normalizeItems(byName ? operation.names : operation.items)
            if (!byName && operation.items === undefined) throw new Error(`${context}: removeArr requires names or items`)
            for (const selector of selectors) {
                const index = current.findIndex((value) => byName ? isJsonRecord(value) && value.name === selector : value === selector)
                if (index >= 0) current.splice(index, 1)
                else if (!byName || operation.force !== true) throw new Error(`${context}: removeArr target was not found in ${field}`)
            }
            return
        }
        case 'appendArr':
            current.push(...items)
            return
        case 'appendIfNotExistsArr':
            for (const item of items) {
                if (!current.some((value) => valuesEqual(value, item))) current.push(item)
            }
            return
        case 'insertArr': {
            if (typeof operation.index !== 'number' || !Number.isInteger(operation.index)) throw new Error(`${context}: insertArr requires an integer index`)
            const index = operation.index < 0 ? current.length : operation.index
            current.splice(index, 0, ...items)
            return
        }
        case 'replaceArr': {
            if (typeof operation.replace !== 'string' && !isJsonRecord(operation.replace)) throw new Error(`${context}: replaceArr requires a replace selector`)
            const selector = operation.replace
            const index = isJsonRecord(selector) && typeof selector.index === 'number' && Number.isInteger(selector.index)
                ? selector.index < 0 ? current.length + selector.index : selector.index
                : current.findIndex((value) => matchesReplacement(value, selector))
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
