import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getVisiblePages, Pagination } from './Pagination'

describe('getVisiblePages', () => {
  it.each([
    [1, 10, [1, 2, 3, 4, 10]],
    [5, 10, [1, 4, 5, 6, 10]],
    [10, 10, [1, 7, 8, 9, 10]],
    [2, 3, [1, 2, 3]],
  ])('returns the nearby pages for page %s of %s', (page, totalPages, expected) => {
    expect(getVisiblePages(page, totalPages)).toEqual(expected)
  })
})

describe('Pagination', () => {
  it('marks the current page and lets the user select a nearby page', () => {
    const onPage = vi.fn()
    render(<Pagination page={5} totalPages={10} totalItems={100} start={41} end={50} onPage={onPage} />)

    expect(screen.getByRole('button', { name: 'Page 5, current page' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to page 10' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 6' }))

    expect(onPage).toHaveBeenCalledWith(6)
  })
})
