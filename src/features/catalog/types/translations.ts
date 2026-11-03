export interface ItemTranslation {
    name?: string
    /** Exact original text prevents a revised source from receiving a stale translation. */
    texts?: Record<string, string>
}

export interface CatalogTranslations {
    items: Record<string, ItemTranslation>
    shared: Record<string, string>
}
