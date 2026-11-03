import itemNames from './items.json'
import itemTexts from './item-texts.json'
import sharedTexts from './shared-texts.json'
import type { CatalogTranslations } from '../../../types'

const items: CatalogTranslations['items'] = { ...itemNames }

for (const [id, texts] of Object.entries(itemTexts)) {
    items[id] = { ...items[id], texts }
}

const portuguese: CatalogTranslations = { items, shared: sharedTexts }

export default portuguese
