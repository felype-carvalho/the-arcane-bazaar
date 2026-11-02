import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MeasurementProvider } from '../model/MeasurementProvider'
import { defaultMeasurements } from '../model/preferences'
import { MeasurementText } from './MeasurementText'
import { MeasurementTableHeading } from './MeasurementTableHeading'

describe('measurement text', () => {
    it('updates independent units without altering surrounding prose', () => {
        const text = 'Speed: 30 feet; weighs 10 lb; cargo 150 tons; 2 mph; holds 1 gallon.'
        const { rerender } = render(<MeasurementProvider preferences={defaultMeasurements('en-US')}><MeasurementText text={text} /></MeasurementProvider>)
        expect(screen.getByRole('button', { name: '30 ft. (6)' })).toBeInTheDocument()
        rerender(<MeasurementProvider preferences={{ ...defaultMeasurements('en-US'), distance: 'metric', liquids: 'metric' }}><MeasurementText text={text} /></MeasurementProvider>)
        expect(screen.getByRole('button', { name: '9 m (6)' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '10 lb' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '2 mph' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '3.8 L' })).toBeInTheDocument()
        expect(document.body).toHaveTextContent('cargo 150 tons')
    })

    it('compares on hover, focus and tap, and consumes Escape before the parent', () => {
        const parentEscape = vi.fn()
        document.addEventListener('keydown', parentEscape)
        const { unmount } = render(<MeasurementText text="30 feet" />)
        const trigger = screen.getByRole('button', { name: '30 ft. (6)' })
        fireEvent.mouseEnter(trigger)
        expect(screen.getByRole('tooltip')).toHaveTextContent('Metric: 9 m (6)')
        expect(screen.getByRole('tooltip')).toHaveTextContent('Squares: 6')
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

    it('converts cost denominators and table headings without changing the associated amount', () => {
        render(<MeasurementProvider preferences={defaultMeasurements('pt-BR')}>
            <MeasurementText text="2 GP per 100 lb per mile" />
            <MeasurementTableHeading text="Length (feet)" />
        </MeasurementProvider>)
        expect(document.body).toHaveTextContent('2 GP per 45.4 kg per 1.6 km')
        expect(document.body).toHaveTextContent('Length (m)')
    })
})
