import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  start: number
  end: number
  onPage: (page: number) => void
}

export function Pagination({ page, totalPages, totalItems, start, end, onPage }: PaginationProps) {
  return (
    <div className="flex min-h-12 items-center justify-between border-t border-border bg-panel px-4 py-2">
      <p className="text-[10px] text-muted">{totalItems ? `${start}–${end} of ${totalItems} items` : '0 items'}</p>
      <div className="flex items-center gap-1">
        <button className="page-button" disabled={page === 1} onClick={() => onPage(1)} aria-label="First page"><ChevronsLeft size={14} /></button>
        <button className="page-button" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
        <span className="mx-1 font-display text-[11px] text-cream"><strong className="text-gold-bright">{page}</strong> / {Math.max(totalPages, 1)}</span>
        <button className="page-button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
        <button className="page-button" disabled={page >= totalPages} onClick={() => onPage(totalPages)} aria-label="Last page"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}
