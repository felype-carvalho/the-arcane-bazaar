import { CATEGORY_ICONS } from '../../model/items/categories'
import type { Category } from '../../types'

interface ItemCategoriesProps {
    categories: readonly Category[]
    presentation?: 'inline' | 'pills'
}

export function ItemCategories({ categories, presentation = 'inline' }: ItemCategoriesProps) {
    return (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Item categories">
            {categories.map((category) => (
                <span key={category} className={presentation === 'pills' ? 'category-chip' : 'inline-flex max-w-full items-center gap-1'}>
                    <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
                    <span>{category}</span>
                </span>
            ))}
        </span>
    )
}
