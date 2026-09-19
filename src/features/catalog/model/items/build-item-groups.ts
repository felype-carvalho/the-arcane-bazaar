import type { Item, ItemGroupOption, Rarity } from '../../types'
import { orderCategories } from './categories'
import { entityKey, lookupUid, parseUid } from './indexes'
import { withEffectiveRarity } from './normalize-item'
import type { RawItemEntity, RawItemProperty } from './raw-types'

const EVOLUTION_RARITIES: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary']

export function isEvolvingItem(entity: RawItemEntity, properties: ReadonlyMap<string, RawItemProperty>): boolean {
    return (entity.property ?? []).some((uid) => typeof uid === 'string' && uid.trim()
        && lookupUid(properties, uid, { defaultSource: entity.source })?.template === 'Evolving Item')
}

export function buildItemGroups(
    groups: readonly { item: Item; entity: RawItemEntity }[],
    candidates: readonly Item[],
    properties: ReadonlyMap<string, RawItemProperty>,
    applyRarity: (item: Item, rarity: Rarity) => Item = withEffectiveRarity,
) {
    const index = new Map(candidates.map((item) => [entityKey(item.name, item.source), item]))
    const incorporatedIds = new Set<string>()
    const unresolvedReferences: string[] = []
    const groupsWithoutOptions: string[] = []
    const unknownEvolutionStages: string[] = []
    let inferredEvolutionStages = 0
    const items = groups.map(({ item: group, entity }) => {
        if (group.type !== 'Magic') return group
        const groupOptions: ItemGroupOption[] = []
        const references = Array.isArray(entity.items) && entity.items.every((uid) => typeof uid === 'string') ? entity.items : []
        if (entity.items !== undefined && references !== entity.items) unresolvedReferences.push(`${group.name}|${group.source} -> invalid items`)
        for (const uid of references) {
            let member: Item | undefined
            try {
                const parsed = parseUid(uid)
                if (uid.split('|').length > 2) throw new Error('Invalid UID')
                member = index.get(entityKey(parsed.name, parsed.source ?? group.source))
                if (!member && !parsed.source) {
                    const matches = candidates.filter((candidate) => candidate.name.toLowerCase() === parsed.name.toLowerCase())
                    if (matches.length === 1) member = matches[0]
                }
            } catch { /* Invalid references are reported below without suppressing candidates. */ }
            if (!member) {
                unresolvedReferences.push(`${group.name}|${group.source} -> ${uid}`)
                continue
            }
            const id = `${group.id}::${member.id}`
            if (groupOptions.some((option) => option.id === id)) continue
            const explicit = member.rarity !== 'Unknown' && member.rarity !== 'Varies'
            const inherited = !explicit && group.rarity !== 'Varies' && group.rarity !== 'Unknown'
            const resolvedItem = explicit ? member : applyRarity(member, inherited ? group.rarity : 'Unknown')
            groupOptions.push({ id, label: member.name, source: member.source, kind: 'member', rarityOrigin: explicit ? 'explicit' : inherited ? 'inherited' : 'unknown', resolvedItem })
            incorporatedIds.add(member.id)
        }
        if (isEvolvingItem(entity, properties) && !references.some((uid) => {
            try {
                const parsed = parseUid(uid)
                return entityKey(parsed.name, parsed.source ?? group.source) === entityKey(group.name, group.source)
            } catch { return false }
        })) {
            const explicit = group.rarity !== 'Varies' && group.rarity !== 'Unknown'
            const firstRarity = groupOptions.find((option) => option.rarityOrigin === 'explicit' && EVOLUTION_RARITIES.includes(option.resolvedItem.rarity))?.resolvedItem.rarity
            const rarity = explicit ? group.rarity : EVOLUTION_RARITIES[EVOLUTION_RARITIES.indexOf(firstRarity ?? 'Unknown') - 1] ?? 'Unknown'
            const rarityOrigin = explicit ? 'explicit' : rarity === 'Unknown' ? 'unknown' : 'inferred'
            if (rarityOrigin === 'inferred') inferredEvolutionStages++
            if (rarityOrigin === 'unknown') unknownEvolutionStages.push(`${group.name}|${group.source}`)
            groupOptions.unshift({ id: `${group.id}::initial`, label: 'Initial', source: group.source, kind: 'inferredInitialStage', rarityOrigin, resolvedItem: withEffectiveRarity(group, rarity) })
        }
        if (!groupOptions.length) groupsWithoutOptions.push(`${group.name}|${group.source}`)
        return {
            ...group,
            groupOptions,
            availableRarities: [...new Set(groupOptions.map((option) => option.resolvedItem.rarity))],
            categories: orderCategories(group.category, [...group.categories, ...groupOptions.flatMap((option) => option.resolvedItem.categories)]),
            tags: [...new Set([...group.tags, ...groupOptions.flatMap((option) => [option.label.toLowerCase(), option.source.toLowerCase(), ...option.resolvedItem.tags])])],
        }
    })
    return { items, incorporatedIds, groupedMembers: incorporatedIds.size, inferredEvolutionStages, groupsWithoutOptions, unresolvedReferences, unknownEvolutionStages }
}
