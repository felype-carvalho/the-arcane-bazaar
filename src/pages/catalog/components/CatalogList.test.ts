import { describe, expect, it } from 'vitest'
import { formatCatalogItemName } from './CatalogList'

describe('formatCatalogItemName', () => {
  it.each([
    ['+1 All-Purpose Tool', 'All-Purpose Tool, +1'],
    ['+2 Weapon', 'Weapon, +2'],
    ['+3 Shield', 'Shield, +3'],
  ])('moves the leading bonus in %s to the end', (name, expected) => {
    expect(formatCatalogItemName(name)).toBe(expected)
  })

  it.each([
    'All-Purpose Tool +1',
    '+4 Weapon',
    'Sword of Sharpness',
  ])('keeps unsupported names unchanged: %s', (name) => {
    expect(formatCatalogItemName(name)).toBe(name)
  })
})
