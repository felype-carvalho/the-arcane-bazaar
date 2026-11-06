import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/app/i18n'
import { MeasurementProvider } from '../model/MeasurementProvider'
import { defaultMeasurements } from '../model/preferences'
import { MeasurementText } from './MeasurementText'
import { MeasurementTableHeading } from './MeasurementTableHeading'

afterEach(async () => {
    await act(() => i18n.changeLanguage('en-US'))
})

describe('measurement text', () => {
    it('updates independent units without altering surrounding prose', () => {
        const text = 'Speed: 30 feet; weighs 10 lb; cargo 150 tons; 2 mph; holds 1 gallon.'
        const { rerender } = render(<MeasurementProvider preferences={defaultMeasurements('en-US')}><MeasurementText text={text} /></MeasurementProvider>)
        expect(screen.getByRole('button', { name: '30 ft. (6)' })).toBeInTheDocument()
        rerender(<MeasurementProvider preferences={{ ...defaultMeasurements('en-US'), distance: 'metric', liquids: 'metric' }}><MeasurementText text={text} /></MeasurementProvider>)
        expect(screen.getByRole('button', { name: '9 m (6)' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '10 lb' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '2 mph' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '4 L' })).toBeInTheDocument()
        expect(document.body).toHaveTextContent('cargo 150 tons')
    })

    it('compares on hover, focus and tap, and consumes Escape before the parent', () => {
        const parentEscape = vi.fn()
        document.addEventListener('keydown', parentEscape)
        const { unmount } = render(<MeasurementText text="30 feet" />)
        const trigger = screen.getByRole('button', { name: '30 ft. (6)' })
        fireEvent.mouseEnter(trigger)
        expect(within(screen.getByRole('tooltip')).getByText('Imperial: 30 ft.', { exact: true })).toBeInTheDocument()
        expect(within(screen.getByRole('tooltip')).getByText('Metric: 9 m', { exact: true })).toBeInTheDocument()
        expect(screen.getByRole('tooltip')).toHaveTextContent('Grid Squares: (6)')
        expect(screen.getByRole('tooltip')).not.toHaveTextContent('1 square =')
        expect(trigger).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
        expect(parentEscape).not.toHaveBeenCalled()
        fireEvent.focus(trigger)
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
        fireEvent.blur(trigger)
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
        fireEvent.click(trigger)
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
        fireEvent.pointerDown(document.body)
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
        unmount()
        document.removeEventListener('keydown', parentEscape)
    })

    it.each(['imperial', 'metric'] as const)('shows range squares only on their own tooltip line with %s preferences', async (distance) => {
        await act(() => i18n.changeLanguage('pt-BR'))
        render(<MeasurementProvider preferences={{ ...defaultMeasurements('pt-BR'), distance }}>
            <MeasurementText text="20/60 feet" />
        </MeasurementProvider>)
        const trigger = screen.getByRole('button', { name: distance === 'imperial' ? '20/60 pés (4/12)' : '6/18 m (4/12)' })
        fireEvent.click(trigger)
        const tooltip = screen.getByRole('tooltip')
        expect(within(tooltip).getByText('Imperial: 20/60 pés', { exact: true })).toBeInTheDocument()
        expect(within(tooltip).getByText('Métrico: 6/18 m', { exact: true })).toBeInTheDocument()
        expect(within(tooltip).getByText('Quadrados do Grid: (4/12)', { exact: true })).toBeInTheDocument()
        expect(tooltip.textContent?.match(/\(4\/12\)/g)).toHaveLength(1)
    })

    it('converts cost denominators and table headings without changing the associated amount', () => {
        render(<MeasurementProvider preferences={defaultMeasurements('pt-BR')}>
            <MeasurementText text="2 GP per 100 lb per mile" />
            <MeasurementTableHeading text="Length (feet)" />
        </MeasurementProvider>)
        expect(document.body).toHaveTextContent('2 GP per 50 kg per 1.5 km')
        expect(document.body).toHaveTextContent('Length (m)')
    })
})
