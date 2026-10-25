import type { Availability, Category, Item, ItemEdition, Rarity } from '../../types'
import type { ItemDescriptionBlock, ItemInformation } from '../../types/catalog'
import { CATEGORY_ICONS, resolveCategories } from './categories'
import { lookupUid } from './indexes'
import { cleanInlineTags, entryBlockLines, renderEntryTree, resolveEntityEntryBlocks } from './resolve-entries'
import type { ProcessedItemEntity, RawItemEntry, RawItemProperty, RawItemType, RawNamedEntity } from './raw-types'
import { isJsonRecord } from './raw-types'

export interface NormalizationIndexes {
    itemEntries: ReadonlyMap<string, RawItemEntry>
    itemTypes: ReadonlyMap<string, RawItemType>
    itemProperties: ReadonlyMap<string, RawItemProperty>
    itemMasteries: ReadonlyMap<string, RawNamedEntity>
    typeAdditionalEntries: ReadonlyMap<string, unknown[]>
}

const DAMAGE_TYPES: Record<string, string> = {
    A: 'acid', B: 'bludgeoning', C: 'cold', F: 'fire', L: 'lightning', N: 'necrotic', P: 'piercing',
    O: 'poison', Y: 'psychic', R: 'radiant', S: 'slashing', T: 'thunder', I: 'force',
}

const RARITY_MAP: Record<string, Rarity> = {
    none: 'None', common: 'Common', uncommon: 'Uncommon', rare: 'Rare', 'very rare': 'Very Rare',
    legendary: 'Legendary', artifact: 'Artifact', varies: 'Varies', unknown: 'Unknown', 'unknown (magic)': 'Unknown',
}

const FALLBACK_PRICE_GP: Partial<Record<Rarity, number>> = {
    Common: 100,
    Uncommon: 400,
    Rare: 4_000,
    'Very Rare': 40_000,
    Legendary: 200_000,
}

const FOCUS_CLASSES: Record<string, string[]> = {
    arcane: ['Sorcerer', 'Warlock', 'Wizard'],
    druid: ['Druid', 'Ranger'],
    holy: ['Cleric', 'Paladin'],
}

const ALL_SPELLCASTER_CLASSES = new Set([
    'Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard',
])

const FOCUS_DESCRIPTIONS: Record<string, Record<string, string>> = {
    PHB: {
        arcane: 'An arcane focus is a specially made crystal, orb, rod, staff, wand, or similar item used to channel arcane spells. Sorcerers, Warlocks, and Wizards can use it as a spellcasting focus.',
        druid: 'A druidic focus is made from plants, wood, or materials associated with sacred animals. Druids and Rangers can use it as a spellcasting focus.',
        holy: 'A holy symbol represents a deity or pantheon and may be worn as an amulet, displayed on a shield, or kept as a reliquary. Clerics and Paladins can use it as a spellcasting focus.',
    },
    XPHB: {
        arcane: 'An arcane focus can be a crystal, orb, rod, staff, or wand, decorated with gems or carvings to channel arcane magic. Sorcerers, Warlocks, and Wizards can use it as a spellcasting focus.',
        druid: 'A druidic focus can be a sprig of mistletoe, wooden staff, or yew wand, carved, wrapped with ribbon, or painted to channel primal magic. Druids and Rangers can use it as a spellcasting focus.',
        holy: 'A holy symbol can be an amulet, emblem, or reliquary, adorned with jewels or paint to channel divine magic. Clerics and Paladins can use it as a spellcasting focus.',
    },
}

const MAGIC_TYPE_SOURCES = new Set(['RD', 'RG', 'SC', 'WD'])

export function normalizeRarity(value: unknown): Rarity {
    if (typeof value !== 'string') return 'Unknown'
    return RARITY_MAP[value.trim().toLocaleLowerCase('en-US')] ?? 'Unknown'
}

export function deriveAvailability(rarity: Rarity): Availability {
    if (rarity === 'None' || rarity === 'Common' || rarity === 'Uncommon') return 'Available'
    if (rarity === 'Rare' || rarity === 'Very Rare') return 'Limited'
    return 'Unavailable'
}

export function deriveBasePriceGp(entity: ProcessedItemEntity, rarity: Rarity): number | null {
    if (typeof entity.value === 'number' && Number.isFinite(entity.value) && entity.value >= 0) return entity.value / 100
    return FALLBACK_PRICE_GP[rarity] ?? null
}

function sourceFallbacks(entity: ProcessedItemEntity, abbreviation: string): string[] {
    const modern = entity._catalogEdition === 'one'
    if (MAGIC_TYPE_SOURCES.has(abbreviation)) return modern ? ['XDMG', 'DMG'] : ['DMG', 'XDMG']
    return modern ? ['XPHB', 'PHB'] : ['PHB', 'XPHB']
}

function typeDefinition(entity: ProcessedItemEntity, index: ReadonlyMap<string, RawItemType>): RawItemType | undefined {
    if (typeof entity.type !== 'string') return undefined
    const abbreviation = entity.type.split('|')[0]
    return lookupUid(index, entity.type, { fallbackSources: sourceFallbacks(entity, abbreviation) })
}

function propertyDefinition(entity: ProcessedItemEntity, uid: string, index: ReadonlyMap<string, RawItemProperty>): RawItemProperty | undefined {
    return lookupUid(index, uid, { fallbackSources: entity._catalogEdition === 'one' ? ['XPHB', 'XDMG', 'PHB', 'DMG'] : ['PHB', 'DMG', 'XPHB', 'XDMG'] })
}

function propertyName(property: RawItemProperty): string {
    if (typeof property.name === 'string') return property.name
    const first = property.entries?.[0]
    if (isJsonRecord(first) && typeof first.name === 'string') return first.name
    return property.abbreviation
}

function isArmor(entity: ProcessedItemEntity): boolean {
    return entity.armor === true || ['LA', 'MA', 'HA', 'S'].includes(entity.type?.split('|')[0] ?? '')
}

function stablePart(value: string): string {
    return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown'
}

export function createItemId(entity: ProcessedItemEntity): string {
    const parts = [entity._catalogOrigin, entity.source, entity.name]
    if (entity._catalogBase) parts.push('base', entity._catalogBase.source, entity._catalogBase.name)
    if (entity._catalogVariant) parts.push('variant', entity._catalogVariant.source, entity._catalogVariant.name)
    return parts.map(stablePart).join('--')
}

function formatWeight(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)} lb`
}

function unique(values: readonly string[]): string[] {
    const seen = new Set<string>()
    return values.filter((value) => {
        const trimmed = value.trim()
        const key = trimmed.toLocaleLowerCase('en-US')
        if (!trimmed || seen.has(key)) return false
        seen.add(key)
        return true
    })
}

function auxiliaryProperties(entity: ProcessedItemEntity, indexes: NormalizationIndexes, type: RawItemType | undefined): { properties: string[]; tags: string[] } {
    const properties: string[] = []
    const tags: string[] = []

    if (type) {
        tags.push(type.name)
        properties.push(...renderEntryTree(type.entries, entity, indexes.itemEntries))
    }

    const propertyUids = Array.isArray(entity.property) ? entity.property.filter((value): value is string => typeof value === 'string') : []
    for (const uid of propertyUids) {
        const definition = propertyDefinition(entity, uid, indexes.itemProperties)
        if (!definition) {
            tags.push(uid)
            continue
        }
        const name = propertyName(definition)
        tags.push(name)
        const rendered = renderEntryTree(definition.entries, entity, indexes.itemEntries)
        if (rendered.length) properties.push(`${name}: ${rendered[0]}`, ...rendered.slice(1))
    }

    const masteries = Array.isArray(entity.mastery) ? entity.mastery.filter((value): value is string => typeof value === 'string') : []
    for (const uid of masteries) {
        const mastery = lookupUid(indexes.itemMasteries, uid, { fallbackSources: ['XPHB'] })
        if (!mastery) continue
        tags.push(mastery.name)
        const rendered = renderEntryTree(mastery.entries, entity, indexes.itemEntries)
        if (rendered.length) properties.push(`Mastery — ${mastery.name}: ${rendered[0]}`, ...rendered.slice(1))
    }

    if (typeof entity.type === 'string') {
        const additional = indexes.typeAdditionalEntries.get(entity.type.toLocaleLowerCase('en-US'))
        properties.push(...renderEntryTree(additional, entity, indexes.itemEntries))
    }
    if (isArmor(entity)) {
        if (entity.stealth === true) properties.push('The wearer has disadvantage on Dexterity (Stealth) checks.')
        const strength = informationText(entity.strength)
        if (strength && /^\d+$/.test(strength)) properties.push(`If the wearer has a Strength score lower than ${strength}, their speed is reduced by 10 feet.`)
    }
    return { properties, tags }
}

function informationText(value: unknown): string | undefined {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? String(value) : undefined
    if (typeof value !== 'string') return undefined
    return cleanInlineTags(value).trim() || undefined
}

function equipmentInformation(entity: ProcessedItemEntity, indexes: NormalizationIndexes, type: RawItemType | undefined): Pick<Item, 'weaponInformation' | 'armorInformation'> {
    const typeCode = entity.type?.split('|')[0]
    const weapon = entity.weapon === true || ['M', 'R'].includes(typeCode ?? '') || typeof entity.dmg1 === 'string'
    const armor = isArmor(entity)
    const ammoType = informationText(entity.ammoType)?.split('|')[0].trim().replace(/^crossbow /i, '').replace(/\b[a-z]/g, (letter) => letter.toLocaleUpperCase('en-US'))
    const properties = (entity.property ?? []).flatMap((uid) => {
        if (typeof uid !== 'string') return []
        const definition = propertyDefinition(entity, uid, indexes.itemProperties)
        if (!definition) return []
        const name = propertyName(definition)
        const displayName = name.charAt(0).toLocaleUpperCase('en-US') + name.slice(1)
        if (uid.split('|')[0] === 'A' && ammoType) return [`${displayName} (${ammoType})`]
        return [uid.split('|')[0] === 'V' && informationText(entity.dmg2) ? `${displayName} (${informationText(entity.dmg2)})` : displayName]
    })
    const information: ItemInformation[] = []
    const add = (label: string, value: unknown) => {
        const text = informationText(value)
        if (text) information.push({ label, value: text })
    }
    if (weapon) {
        if (informationText(entity.dmg1)) add('Base Damage', [informationText(entity.dmg1), DAMAGE_TYPES[String(entity.dmgType)]].filter(Boolean).join(' '))
        add('Properties', properties.join(', '))
        const masteries = Array.isArray(entity.mastery) ? entity.mastery.flatMap((uid) => {
            if (typeof uid !== 'string') return []
            const mastery = lookupUid(indexes.itemMasteries, uid, { fallbackSources: ['XPHB'] })
            return mastery ? [mastery.name] : []
        }) : []
        add('Mastery', masteries.join(', '))
        if (informationText(entity.range)) add('Range', `${informationText(entity.range)} ft.`)
        add('Weapon Type', [informationText(entity.weaponCategory), type?.name].filter(Boolean).join(' · '))
        add('Magic attack / damage bonus', entity.bonusWeapon)
        return { weaponInformation: information.length ? information : undefined }
    }
    if (armor) {
        const baseAc = informationText(entity.ac)
        add(typeCode === 'S' ? 'AC bonus' : 'Base AC', baseAc === undefined ? undefined : typeCode === 'S' ? `+${baseAc}` : typeCode === 'LA' ? `${baseAc} + Dex` : typeCode === 'MA' ? `AC ${baseAc} + Dex (max 2)` : baseAc)
        add('Armor type', type?.name)
        add('Properties', properties.join(', '))
        add('Strength requirement', entity.strength)
        if (entity.stealth === true) add('Stealth', 'Disadvantage')
        add('Magic AC bonus', entity.bonusAc)
        return { armorInformation: information.length ? information : undefined }
    }
    return {}
}

function vehicleInformation(entity: ProcessedItemEntity, categories: readonly Category[]): ItemInformation[] | undefined {
    if (!categories.includes('Vehicle')) return undefined

    const number = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
    const format = (value: number): string => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)
    const information: ItemInformation[] = []
    const add = (label: string, value: string | undefined) => { if (value) information.push({ label, value }) }

    const speed = number(entity.vehSpeed)
    if (speed !== undefined) add('Speed', `${format(speed)} mph`)

    const cargo = number(entity.capCargo)
    const passengers = number(entity.capPassenger)
    const capacity = [
        cargo === undefined ? undefined : `${format(cargo)} ${cargo === 1 ? 'ton' : 'tons'} cargo`,
        passengers === undefined ? undefined : `${format(passengers)} ${passengers === 1 ? 'passenger' : 'passengers'}`,
    ].filter((value): value is string => value !== undefined)
    add('Carrying Capacity', capacity.length ? capacity.join(' · ') : undefined)

    const crew = number(entity.crew)
    const crewMin = number(entity.crewMin)
    const crewMax = number(entity.crewMax)
    add('Crew', crew !== undefined ? format(crew) : crewMin !== undefined && crewMax !== undefined ? `${format(crewMin)}–${format(crewMax)}` : crewMin !== undefined ? format(crewMin) : crewMax !== undefined ? format(crewMax) : undefined)

    const ac = number(entity.vehAc)
    const hp = number(entity.vehHp)
    const damageThreshold = number(entity.vehDmgThresh)
    if (ac !== undefined) add('AC', format(ac))
    if (hp !== undefined) add('HP', format(hp))
    if (damageThreshold !== undefined) add('Damage Threshold', format(damageThreshold))

    const travelCost = number(entity.travelCost)
    const shippingCost = number(entity.shippingCost)
    if (travelCost !== undefined) add('Personal Travel Cost', `${format(travelCost / 100)} GP per mile per passenger`)
    if (shippingCost !== undefined) add('Shipping Cost', `${format(shippingCost / 100)} GP per 100 lb per mile`)

    return information.length ? information : undefined
}

function mountInformation(entity: ProcessedItemEntity, categories: readonly Category[], entryLines: readonly string[]): ItemInformation[] | undefined {
    if (!categories.includes('Mount')) return undefined

    const format = (value: unknown): string | undefined =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0
            ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)
            : undefined
    const information: ItemInformation[] = []
    const speed = format(entity.speed)
    const capacity = format(entity.carryingCapacity)
    if (speed !== undefined) information.push({ label: 'Speed', value: `${speed} ft.` })
    if (capacity !== undefined) information.push({ label: 'Carrying Capacity', value: `${capacity} lb` })

    const statBlock = entryLines
        .map((line) => /\buses?\s+the\s+([a-z][a-z' -]*?)\s+stat block\b/i.exec(line)?.[1].trim())
        .find((name): name is string => Boolean(name))
    const monsterName = statBlock ? statBlock.charAt(0).toLocaleUpperCase('en-US') + statBlock.slice(1) : entity.name
    information.push({ label: 'Monster Stat Block', value: monsterName })

    return information.length ? information : undefined
}

function focusClasses(entity: ProcessedItemEntity): string[] {
    const explicit = Array.isArray(entity.focus)
        ? unique(entity.focus.filter((value): value is string => typeof value === 'string').map((value) => value.trim()))
        : []
    const focusType = typeof entity.scfType === 'string' ? entity.scfType.toLocaleLowerCase('en-US') : ''
    if (entity.type?.split('|')[0] === 'SCF' && FOCUS_DESCRIPTIONS[entity.source]?.[focusType]) return FOCUS_CLASSES[focusType]
    return explicit.length ? explicit : FOCUS_CLASSES[focusType] ?? []
}

function spellcastingFocusInformation(entity: ProcessedItemEntity, categories: readonly Category[]): ItemInformation[] | undefined {
    if (categories.includes('Instrument')) return [{ label: 'Spellcasting Focus Requirement', value: 'Bard' }]
    if (!categories.includes('Spellcasting Focus')) return undefined
    const classes = focusClasses(entity)
    const anySpellcaster = entity.focus === true || (classes.length === ALL_SPELLCASTER_CLASSES.size && classes.every((name) => ALL_SPELLCASTER_CLASSES.has(name)))
    return anySpellcaster || classes.length
        ? [{ label: 'Spellcasting Focus Requirement', value: anySpellcaster ? 'Any Spellcaster' : classes.join(', ') }]
        : undefined
}

function standardFocusDescription(entity: ProcessedItemEntity): string | undefined {
    if (entity.type?.split('|')[0] !== 'SCF') return undefined
    const focusType = typeof entity.scfType === 'string' ? entity.scfType.toLocaleLowerCase('en-US') : ''
    const description = FOCUS_DESCRIPTIONS[entity.source]?.[focusType]
    if (!description || entity._catalogOrigin !== 'itemGroup' || !Array.isArray(entity.items)) return description
    const forms = unique(entity.items.filter((uid): uid is string => typeof uid === 'string').map((uid) => uid.split('|')[0].trim().toLocaleLowerCase('en-US')))
    if (!forms.length) return description
    const namedForms = forms.map((form) => `${/^[aeiou]/i.test(form) ? 'an' : 'a'} ${form}`)
    const formList = namedForms.length === 1 ? namedForms[0] : namedForms.length === 2 ? namedForms.join(' or ') : `${namedForms.slice(0, -1).join(', ')}, or ${namedForms.at(-1)}`
    return `${description} Available forms include ${formList}.`
}

export function normalizeItem(entity: ProcessedItemEntity, indexes: NormalizationIndexes): Item {
    if (!entity.name.trim() || !entity.source.trim()) throw new Error('Cannot normalize an item without name and source')
    const rarity = normalizeRarity(entity.rarity)
    const type = typeDefinition(entity, indexes.itemTypes)
    const entryBlocks = resolveEntityEntryBlocks(entity, indexes.itemEntries)
    const entryLines = entryBlocks.flatMap(entryBlockLines).filter((line, index, lines) => line && lines.indexOf(line) === index)
    const auxiliary = auxiliaryProperties(entity, indexes, type)
    const focusDescription = standardFocusDescription(entity)
    const seenDescription = new Set<string>()
    const descriptionBlocks: ItemDescriptionBlock[] | undefined = entryBlocks.some((block) => block.type === 'table')
        ? [...(focusDescription ? [{ type: 'paragraph' as const, text: focusDescription }] : []), ...entryBlocks, ...auxiliary.properties.map((text): ItemDescriptionBlock => ({ type: 'paragraph', text }))]
            .filter((block) => {
                if (block.type === 'table') return true
                const key = block.text.trim().toLocaleLowerCase('en-US')
                if (!key || seenDescription.has(key)) return false
                seenDescription.add(key)
                return true
            })
        : undefined
    const description = focusDescription ?? entryLines[0] ?? `${type?.name ?? (entity._catalogOrigin === 'itemGroup' ? 'Item group' : 'Item')} from ${entity.source}.`
    const categories = resolveCategories(entity, description)
    const category = categories[0]
    const rawRarity = typeof entity.rarity === 'string' ? entity.rarity.toLocaleLowerCase('en-US') : ''
    const itemType = entity._catalogOrigin === 'baseitem' || rawRarity === 'none' || rawRarity === 'unknown' ? 'Common' : 'Magic'
    const subtype = type?.name ?? (entity._catalogOrigin === 'itemGroup' ? 'Item group' : entity.wondrous === true ? 'Wondrous item' : 'Other')

    const rawTags = [
        entity.source,
        subtype,
        entity._catalogOrigin,
        ...auxiliary.tags,
        ...(Array.isArray(entity.miscTags) ? entity.miscTags.map(String) : []),
        ...(Array.isArray(entity.focus) ? entity.focus.map(String) : []),
        ...(Array.isArray(entity.resist) ? entity.resist.map((value) => `${String(value)} resistance`) : []),
        typeof entity.dmgType === 'string' ? DAMAGE_TYPES[entity.dmgType] ?? entity.dmgType : '',
    ]

    return {
        id: createItemId(entity),
        name: entity.name,
        icon: CATEGORY_ICONS[category],
        type: itemType,
        rarity,
        category,
        categories,
        subtype,
        availability: deriveAvailability(rarity),
        basePriceGp: deriveBasePriceGp(entity, rarity),
        hasExplicitPrice: typeof entity.value === 'number' && Number.isFinite(entity.value) && entity.value >= 0,
        weight: formatWeight(entity.weight),
        description,
        properties: unique([...entryLines.slice(1), ...auxiliary.properties]),
        tags: unique(rawTags.map((tag) => tag.trim().toLocaleLowerCase('en-US'))),
        attunement: entity.reqAttune === true || (typeof entity.reqAttune === 'string' && entity.reqAttune.trim().length > 0),
        source: entity.source,
        edition: entity._catalogEdition as ItemEdition,
        origin: entity._catalogOrigin,
        imageFallback: entity._catalogOrigin === 'specificVariant' ? entity._catalogVariant : undefined,
        sourcePage: typeof entity.page === 'number' && Number.isInteger(entity.page) && entity.page >= 0 ? entity.page : undefined,
        attunementRequirement: typeof entity.reqAttune === 'string' ? informationText(entity.reqAttune) : undefined,
        characteristics: unique([...(focusDescription ? [focusDescription] : []), ...entryLines, ...auxiliary.properties]),
        descriptionBlocks,
        ...equipmentInformation(entity, indexes, type),
        vehicleInformation: vehicleInformation(entity, categories),
        mountInformation: mountInformation(entity, categories, entryLines),
        spellcastingFocusInformation: spellcastingFocusInformation(entity, categories),
    }
}

export function withEffectiveRarity(item: Item, rarity: Rarity): Item {
    return {
        ...item,
        rarity,
        availability: deriveAvailability(rarity),
        basePriceGp: item.hasExplicitPrice ? item.basePriceGp : FALLBACK_PRICE_GP[rarity] ?? null,
    }
}
