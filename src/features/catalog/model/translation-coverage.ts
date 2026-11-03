import type { Item } from '../types'

export interface CatalogTextField {
    field: string
    text: string
}

/** Visible item content, using the same block/fallback precedence as the item sheet. */
export function getCatalogTextFields(item: Item): CatalogTextField[] {
    const fields: Array<[string, string | undefined]> = [
        ['subtype', item.subtype],
        ['attunementRequirement', item.attunementRequirement],
    ]
    for (const name of ['weaponInformation', 'armorInformation', 'vehicleInformation', 'mountInformation', 'spellcastingFocusInformation'] as const) {
        item[name]?.forEach((entry, index) => fields.push([`${name}.${index}.value`, entry.value]))
    }
    const blocks = item.descriptionBlocks ?? (item.characteristics ?? [item.description, ...item.properties]).map((text) => ({ type: 'paragraph' as const, text }))
    blocks.forEach((block, index) => {
        if (block.type === 'paragraph') fields.push([`description.${index}`, block.text])
        else {
            fields.push([`description.${index}.caption`, block.caption])
            block.columns.forEach((text, column) => fields.push([`description.${index}.columns.${column}`, text]))
            block.rows.forEach((row, rowIndex) => row.forEach((text, column) => fields.push([`description.${index}.rows.${rowIndex}.${column}`, text])))
        }
    })
    return fields.flatMap(([field, text]) => typeof text === 'string' && text.trim() ? [{ field, text }] : [])
}

/** Pure data is presented by the existing number and measurement renderers. */
export function isPreservedCatalogText(text: string): boolean {
    return text === '—'
        || /^[\s\d.,+−–\-/×%()½¼¾⅓⅔⅛⅜⅝⅞]+$/u.test(text)
        || /^(?:(?:\d*d\d+|\d+)(?:\s*[+\-]\s*\d+)?|[\d.,½¼¾⅓⅔⅛⅜⅝⅞/– -]+\s*(?:ft\.?|feet|foot|lb|pounds?|ounces?|gallons?|pints?|quarts?|mph|inches|cubic feet|cubic foot)(?: per minute)?)$/i.test(text)
}
