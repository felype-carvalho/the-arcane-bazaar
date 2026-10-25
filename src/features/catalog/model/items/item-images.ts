const IMAGE_ROOT = 'https://5e.tools/img/'

export interface ItemImage {
    src: string
    width?: number
    height?: number
    credit?: string
}

interface FluffImage {
    type?: string
    href?: { type?: string; path?: string; url?: string }
    width?: number
    height?: number
    credit?: string
}

export interface ItemFluffEntry {
    name: string
    source: string
    images?: FluffImage[]
    _copy?: { name?: string; source?: string }
}

type ImageIndex = Map<string, ItemFluffEntry>

let imageIndexPromise: Promise<ImageIndex> | undefined

function itemKey(name: string, source: string): string {
    return `${name.trim().toLocaleLowerCase('en-US')}|${source.trim().toLocaleLowerCase('en-US')}`
}

function imageUrl(href: FluffImage['href']): string | null {
    if (href?.type === 'external' && typeof href.url === 'string') {
        try {
            const url = new URL(href.url)
            return url.protocol === 'https:' ? url.href : null
        } catch {
            return null
        }
    }
    if (href?.type !== 'internal' || typeof href.path !== 'string') return null
    const segments = href.path.split('/')
    if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return null
    return IMAGE_ROOT + segments.map(encodeURIComponent).join('/')
}

function toItemImage(image: FluffImage): ItemImage | null {
    if (image.type !== 'image') return null
    const src = imageUrl(image.href)
    if (!src) return null
    return {
        src,
        ...(typeof image.width === 'number' && image.width > 0 ? { width: image.width } : {}),
        ...(typeof image.height === 'number' && image.height > 0 ? { height: image.height } : {}),
        ...(typeof image.credit === 'string' && image.credit.trim() ? { credit: image.credit.trim() } : {}),
    }
}

function createImageIndex(entries: readonly ItemFluffEntry[]): ImageIndex {
    return new Map(entries.map((entry) => [itemKey(entry.name, entry.source), entry]))
}

function findImages(index: ImageIndex, name: string, source: string): ItemImage[] {
    const visited = new Set<string>()
    let key = itemKey(name, source)
    while (!visited.has(key)) {
        visited.add(key)
        const entry = index.get(key)
        if (!entry) return []
        const images = entry.images?.map(toItemImage).filter((image): image is ItemImage => image !== null) ?? []
        if (images.length) return images
        if (!entry._copy?.name) return []
        key = itemKey(entry._copy.name, entry._copy.source ?? entry.source)
    }
    return []
}

export function resolveItemImages(entries: readonly ItemFluffEntry[], name: string, source: string, fallback?: { name: string; source: string }): ItemImage[] {
    const index = createImageIndex(entries)
    const images = findImages(index, name, source)
    return images.length || !fallback ? images : findImages(index, fallback.name, fallback.source)
}

export function getItemImages(name: string, source: string, fallback?: { name: string; source: string }): Promise<ItemImage[]> {
    imageIndexPromise ??= import('../../data/fluff-items.json')
        .then(({ default: data }) => {
            const entries: unknown = data.itemFluff
            if (!Array.isArray(entries)) throw new Error('fluff-items.json: itemFluff array is missing')
            return createImageIndex(entries as ItemFluffEntry[])
        })
        .catch((error: unknown) => {
            imageIndexPromise = undefined
            throw error
        })
    return imageIndexPromise.then((index) => {
        const images = findImages(index, name, source)
        return images.length || !fallback ? images : findImages(index, fallback.name, fallback.source)
    })
}
