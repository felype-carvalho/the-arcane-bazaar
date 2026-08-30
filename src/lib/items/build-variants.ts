import type { JsonRecord, ProcessedItemEntity, RawItemEntity, RawMagicVariant } from './raw-types'
import { isJsonRecord } from './raw-types'

const clone = <T>(value: T): T => structuredClone(value)

export function recursivelyMatches(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    if (Array.isArray(actual)) return expected.some((expectedValue) => actual.some((actualValue) => recursivelyMatches(actualValue, expectedValue)))
    return expected.some((expectedValue) => recursivelyMatches(actual, expectedValue))
  }
  if (Array.isArray(actual)) return actual.some((actualValue) => recursivelyMatches(actualValue, expected))
  if (isJsonRecord(expected)) {
    return isJsonRecord(actual) && Object.entries(expected).every(([key, value]) => recursivelyMatches(actual[key], value))
  }
  return Object.is(actual, expected)
}

export function matchesVariantRequirements(baseItem: RawItemEntity, variant: RawMagicVariant): boolean {
  const required = !variant.requires?.length || variant.requires.some((requirement) => (
    Object.entries(requirement).every(([field, value]) => recursivelyMatches(baseItem[field], value))
  ))
  if (!required) return false
  if (!variant.excludes) return true
  return !Object.entries(variant.excludes).every(([field, value]) => recursivelyMatches(baseItem[field], value))
}

export function editionsAreCompatible(baseEdition: unknown, variantEdition: unknown): boolean {
  if (baseEdition !== 'classic' && baseEdition !== 'one') return true
  return variantEdition === 'classic' ? baseEdition === 'classic' : baseEdition === 'one'
}

class ArithmeticParser {
  private index = 0

  constructor(private readonly expression: string) {}

  parse(): number {
    const result = this.parseAdditive()
    this.skipWhitespace()
    if (this.index !== this.expression.length) throw new Error(`Unexpected token at position ${this.index}`)
    if (!Number.isFinite(result)) throw new Error('Expression result is not finite')
    return result
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative()
    while (true) {
      this.skipWhitespace()
      const operator = this.expression[this.index]
      if (operator !== '+' && operator !== '-') return value
      this.index++
      const right = this.parseMultiplicative()
      value = operator === '+' ? value + right : value - right
    }
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary()
    while (true) {
      this.skipWhitespace()
      const operator = this.expression[this.index]
      if (operator !== '*' && operator !== '/') return value
      this.index++
      const right = this.parseUnary()
      value = operator === '*' ? value * right : value / right
    }
  }

  private parseUnary(): number {
    this.skipWhitespace()
    if (this.expression[this.index] === '+') {
      this.index++
      return this.parseUnary()
    }
    if (this.expression[this.index] === '-') {
      this.index++
      return -this.parseUnary()
    }
    return this.parsePrimary()
  }

  private parsePrimary(): number {
    this.skipWhitespace()
    if (this.expression[this.index] === '(') {
      this.index++
      const value = this.parseAdditive()
      this.skipWhitespace()
      if (this.expression[this.index] !== ')') throw new Error(`Missing closing parenthesis at position ${this.index}`)
      this.index++
      return value
    }
    const start = this.index
    while (/[\d.]/.test(this.expression[this.index] ?? '')) this.index++
    const token = this.expression.slice(start, this.index)
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error(`Expected number at position ${start}`)
    return Number(token)
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.expression[this.index] ?? '')) this.index++
  }
}

export function evaluateItemExpression(expression: string, baseItem: RawItemEntity): number {
  const substituted = expression.replace(/\[\[baseItem\.([A-Za-z][A-Za-z0-9_]*)\]\]/g, (_match, field: string) => {
    const value = baseItem[field]
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Expression references non-numeric baseItem.${field}`)
    return String(value)
  })
  if (/\[\[|\]\]|[A-Za-z_]/.test(substituted)) throw new Error(`Unsupported expression: ${expression}`)
  try {
    return new ArithmeticParser(substituted).parse()
  } catch (error) {
    throw new Error(`Invalid item expression "${expression}"`, { cause: error })
  }
}

function canEvaluateItemExpression(expression: string, baseItem: RawItemEntity): boolean {
  const references = [...expression.matchAll(/\[\[baseItem\.([A-Za-z][A-Za-z0-9_]*)\]\]/g)]
  return references.every((match) => typeof baseItem[match[1]] === 'number' && Number.isFinite(baseItem[match[1]]))
}

function applyArrayChanges(output: JsonRecord, inherits: JsonRecord): void {
  const remove = inherits.propertyRemove
  if (remove !== undefined) {
    const removals = Array.isArray(remove) ? remove : [remove]
    const current = Array.isArray(output.property) ? output.property : []
    output.property = current.filter((value) => !removals.some((candidate) => recursivelyMatches(value, candidate)))
  }
  const add = inherits.propertyAdd
  if (add !== undefined) {
    const additions = Array.isArray(add) ? add : [add]
    const current = Array.isArray(output.property) ? output.property : []
    output.property = [...current, ...clone(additions)]
  }
}

function applyInherits(baseItem: RawItemEntity, variant: RawMagicVariant): ProcessedItemEntity {
  const output = clone(baseItem) as JsonRecord
  const inherits = clone(variant.inherits)
  const baseValue = baseItem.value
  const baseWeight = baseItem.weight
  delete output.value

  const originalName = String(output.name)
  const nameRemove = typeof inherits.nameRemove === 'string' ? inherits.nameRemove : ''
  const namePrefix = typeof inherits.namePrefix === 'string' ? inherits.namePrefix : ''
  const nameSuffix = typeof inherits.nameSuffix === 'string' ? inherits.nameSuffix : ''
  delete inherits.nameRemove
  delete inherits.namePrefix
  delete inherits.nameSuffix

  const valueExpression = typeof inherits.valueExpression === 'string' ? inherits.valueExpression : undefined
  const valueMult = typeof inherits.valueMult === 'number' ? inherits.valueMult : undefined
  const weightExpression = typeof inherits.weightExpression === 'string' ? inherits.weightExpression : undefined
  const weightMult = typeof inherits.weightMult === 'number' ? inherits.weightMult : undefined
  delete inherits.valueExpression
  delete inherits.valueMult
  delete inherits.weightExpression
  delete inherits.weightMult

  applyArrayChanges(output, inherits)
  delete inherits.propertyAdd
  delete inherits.propertyRemove

  for (const [field, value] of Object.entries(inherits)) {
    if (value === null) delete output[field]
    else output[field] = value
  }

  const nameWithoutRemovedText = nameRemove ? originalName.replace(nameRemove, '') : originalName
  output.name = `${namePrefix}${nameWithoutRemovedText}${nameSuffix}`.trim()

  if (valueExpression && canEvaluateItemExpression(valueExpression, baseItem)) output.value = evaluateItemExpression(valueExpression, baseItem)
  else if (valueMult !== undefined && typeof baseValue === 'number') output.value = baseValue * valueMult
  if (weightExpression && canEvaluateItemExpression(weightExpression, baseItem)) output.weight = evaluateItemExpression(weightExpression, baseItem)
  else if (weightMult !== undefined && typeof baseWeight === 'number') output.weight = baseWeight * weightMult

  const source = typeof output.source === 'string' ? output.source : baseItem.source
  const edition = variant.edition === 'classic'
    ? 'classic'
    : baseItem.edition === 'one' ? 'one' : baseItem.edition === 'classic' ? 'classic' : 'unspecified'
  return {
    ...output,
    name: String(output.name),
    source,
    _catalogOrigin: 'specificVariant',
    _catalogEdition: edition,
    _catalogBase: { name: baseItem.name, source: baseItem.source },
    _catalogVariant: { name: variant.name, source },
  } as ProcessedItemEntity
}

export function buildSpecificVariants(baseItems: readonly RawItemEntity[], variants: readonly RawMagicVariant[]): ProcessedItemEntity[] {
  const output: ProcessedItemEntity[] = []
  for (const baseItem of baseItems) {
    if (baseItem.packContents !== undefined) continue
    for (const variant of variants) {
      if (!isJsonRecord(variant.inherits)) throw new Error(`Magic variant ${variant.name} has no valid inherits object`)
      if (!editionsAreCompatible(baseItem.edition, variant.edition)) continue
      if (!matchesVariantRequirements(baseItem, variant)) continue
      output.push(applyInherits(baseItem, variant))
    }
  }
  return output
}
