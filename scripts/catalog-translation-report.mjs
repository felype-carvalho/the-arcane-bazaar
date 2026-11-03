import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createServer } from 'vite'

const dataDirectory = 'src/features/catalog/data'
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null }, appType: 'custom' })

try {
    const { buildCatalog } = await server.ssrLoadModule('/src/features/catalog/model/items/build-catalog.ts')
    const { getCatalogTextFields, isPreservedCatalogText } = await server.ssrLoadModule('/src/features/catalog/model/translation-coverage.ts')
    const inputs = ['items', 'items-base', 'magicvariants']
    const [items, base, variants] = await Promise.all(inputs.map((name) => readJson(`${dataDirectory}/${name}.json`)))
    const resources = await readJson(`${dataDirectory}/translations/pt-BR.json`)
    const catalog = buildCatalog({ items, base, variants })
    const inventory = new Map()
    const families = new Map()
    function visit(item, familyId = item.id) {
        if (inventory.has(item.id)) return
        inventory.set(item.id, item)
        families.set(item.id, familyId)
        item.groupOptions?.forEach((option) => visit(option.resolvedItem, familyId))
        item.variantOptions?.forEach((option) => visit(option.resolvedItem, familyId))
    }
    catalog.forEach((item) => visit(item))
    const pendingTexts = new Map()
    const coverage = []
    let translatedFields = 0
    let preservedFields = 0
    let pendingFields = 0
    for (const item of inventory.values()) {
        const pending = []
        const fields = []
        let translated = 0
        let preserved = 0
        for (const { field, text } of getCatalogTextFields(item)) {
            const itemTranslation = resources.items[item.id]?.texts?.[text]
            const translation = itemTranslation || resources.shared[text]
            if (translation) {
                translated++
                fields.push({ field, status: translation === text ? 'reviewed-unchanged' : 'translated', resource: itemTranslation ? 'item' : 'shared' })
            } else if (isPreservedCatalogText(text)) {
                preserved++
                fields.push({ field, status: 'preserved-data' })
            }
            else {
                pending.push(field)
                fields.push({ field, status: 'pending' })
                const key = createHash('sha256').update(text).digest('hex').slice(0, 16)
                const entry = pendingTexts.get(key) ?? { key, text, items: [] }
                entry.items.push({ id: item.id, field })
                pendingTexts.set(key, entry)
            }
        }
        translatedFields += translated
        preservedFields += preserved
        pendingFields += pending.length
        coverage.push({ id: item.id, source: item.source, name: Boolean(resources.items[item.id]?.name), translatedFields: translated, preservedFields: preserved, pendingFields: pending, fields })
    }
    const summary = {
        catalogItems: catalog.length,
        totalItems: inventory.size,
        translatedNames: coverage.filter((item) => item.name).length,
        pendingNames: coverage.filter((item) => !item.name).length,
        translatedFields,
        preservedFields,
        pendingFields,
        pendingUniqueTexts: pendingTexts.size,
        fullyCoveredItems: coverage.filter((item) => item.name && !item.pendingFields.length).length,
    }
    const sourceHashes = Object.fromEntries(await Promise.all(inputs.map(async (name) => [name, createHash('sha256').update(await readFile(`${dataDirectory}/${name}.json`)).digest('hex')])))
    // A shared passage belongs to its first source/family, retaining every affected item reference.
    const groups = new Map()
    for (const entry of pendingTexts.values()) {
        const sources = [...new Set(entry.items.map(({ id }) => inventory.get(id).source))].sort()
        const familyIds = [...new Set(entry.items.map(({ id }) => families.get(id)))].sort()
        const groupKey = `${sources[0]}\n${familyIds[0]}`
        const group = groups.get(groupKey) ?? { source: sources[0], familyId: familyIds[0], entries: [] }
        group.entries.push({ ...entry, sources, familyIds })
        groups.set(groupKey, group)
    }
    const batches = []
    for (const [, group] of [...groups].sort(([left], [right]) => left.localeCompare(right))) {
        group.entries.sort((left, right) => right.items.length - left.items.length || left.key.localeCompare(right.key))
        for (let offset = 0; offset < group.entries.length; offset += 25) {
            batches.push({ id: `prose-${String(batches.length + 1).padStart(4, '0')}`, source: group.source, familyId: group.familyId, status: 'pending', entries: group.entries.slice(offset, offset + 25) })
        }
    }
    await mkdir('.docs/report', { recursive: true })
    await writeFile('.docs/catalog-translation-coverage.json', JSON.stringify({ glossary: 'Glossário de Termos Traduzidos V. 5.1.26.xlsx', terminology: '2024 preferred, 2014 fallback', sourceHashes, summary, items: coverage }, null, 4) + '\n')
    await writeFile('.docs/report/catalog-translation-pending-batches.json', JSON.stringify(batches, null, 4) + '\n')
    console.log(JSON.stringify(summary, null, 4))
    if (process.argv.includes('--check') && (summary.pendingNames || summary.pendingFields)) {
        throw new Error(`Catalog translation coverage is incomplete: ${summary.pendingNames} names and ${summary.pendingFields} fields`)
    }
} finally {
    await server.close()
}
