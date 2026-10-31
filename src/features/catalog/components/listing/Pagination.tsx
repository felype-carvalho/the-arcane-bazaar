import { useInterfaceTranslation } from '@/app/i18n'
import { Fragment } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
    page: number
    totalPages: number
    totalItems: number
    start: number
    end: number
    pageSize: number
    onPage: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
}

const VISIBLE_PAGE_COUNT = 5
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export function getVisiblePages(page: number, totalPages: number): number[] {
    const pageCount = Math.max(totalPages, 1)
    if (pageCount <= VISIBLE_PAGE_COUNT) {
        return Array.from({ length: pageCount }, (_, index) => index + 1)
    }

    const currentPage = Math.min(Math.max(page, 1), pageCount)
    if (currentPage <= 3) return [1, 2, 3, 4, pageCount]
    if (currentPage >= pageCount - 2) return [1, pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
    return [1, currentPage - 1, currentPage, currentPage + 1, pageCount]
}

export function Pagination({ page, totalPages, totalItems, start, end, pageSize, onPage, onPageSizeChange }: PaginationProps) {
    const { t, number } = useInterfaceTranslation()
    const pageCount = Math.max(totalPages, 1)
    const visiblePages = getVisiblePages(page, totalPages)

    return (
        <div className="grid min-h-12 grid-cols-1 items-center gap-2 border-t border-border bg-panel px-4 py-2 sm:grid-cols-[1fr_auto_1fr]">
            <p className="justify-self-start text-[10px] text-muted">{totalItems ? t("pagination.range", { start: number(start), end: number(end), total: number(totalItems) }) : t("pagination.empty")}</p>
            <nav className="flex max-w-full items-center justify-self-center gap-1 overflow-x-auto" aria-label={t("pagination.label")}>
                <button type="button" className="page-button" disabled={page === 1} onClick={() => onPage(1)} aria-label={t("pagination.first")}><ChevronsLeft size={14} /></button>
                <button type="button" className="page-button" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label={t("pagination.previous")}><ChevronLeft size={14} /></button>
                {visiblePages.map((visiblePage, index) => {
                    const isCurrent = visiblePage === page
                    const hasGap = index > 0 && visiblePage - visiblePages[index - 1] > 1
                    return (
                        <Fragment key={visiblePage}>
                            {hasGap && <span className="page-gap" aria-hidden="true">...</span>}
                            <button
                                type="button"
                                className={`page-button ${isCurrent ? 'active' : ''}`}
                                onClick={() => onPage(visiblePage)}
                                aria-current={isCurrent ? 'page' : undefined}
                                aria-label={isCurrent ? t("pagination.currentPage", { page: number(visiblePage) }) : t("pagination.goToPage", { page: number(visiblePage) })}
                            >
                                {visiblePage}
                            </button>
                        </Fragment>
                    )
                })}
                <button type="button" className="page-button" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label={t("pagination.next")}><ChevronRight size={14} /></button>
                <button type="button" className="page-button" disabled={page >= pageCount} onClick={() => onPage(pageCount)} aria-label={t("pagination.last")}><ChevronsRight size={14} /></button>
            </nav>
            <label className="flex items-center justify-self-end gap-2 text-[10px] text-muted">
                {t("pagination.pageSize")}<select
                    className="rounded border border-border bg-panel px-2 py-1 text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-bright"
                    value={pageSize}
                    onChange={(event) => {
                        const selectedPageSize = Number(event.target.value)
                        if (PAGE_SIZE_OPTIONS.includes(selectedPageSize)) onPageSizeChange(selectedPageSize)
                    }}
                >
                    {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
            </label>
        </div>
    )
}
