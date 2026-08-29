import { ITEMS } from '../data/items'
import type { Item } from '../types'

export async function getItems(): Promise<Item[]> {
  return Promise.resolve(ITEMS.map((item) => ({ ...item, tags: [...item.tags], properties: [...item.properties] })))
}
