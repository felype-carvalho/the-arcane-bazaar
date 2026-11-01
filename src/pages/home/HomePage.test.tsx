import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '@/app/i18n'
import { HomePage } from './HomePage'

afterEach(async () => { await i18n.changeLanguage('en-US') })

function renderHome() {
    return render(
        <MemoryRouter basename="/the-arcane-bazaar" initialEntries={['/the-arcane-bazaar/']}>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<h1>Catalog destination</h1>} />
            </Routes>
        </MemoryRouter>,
    )
}

describe('Home landing page', () => {
    it.each(['Explore Catalog', 'Open Catalog'])('navigates from %s with the deployment base', async (name) => {
        await i18n.changeLanguage('en-US')
        const user = userEvent.setup()
        renderHome()
        const link = screen.getByRole('link', { name })
        expect(link).toHaveAttribute('href', '/the-arcane-bazaar/catalog')
        await user.click(link)
        expect(screen.getByRole('heading', { name: 'Catalog destination' })).toBeInTheDocument()
    })

    it('links to the features and updates the copy and screenshot when language changes', async () => {
        await i18n.changeLanguage('en-US')
        renderHome()
        expect(screen.getByRole('link', { name: 'Discover features' })).toHaveAttribute('href', '#home-resources')
        expect(screen.getByRole('region', { name: 'Features' })).toHaveAttribute('id', 'home-resources')
        const screenshot = screen.getByRole('img')
        expect(screenshot).toHaveAttribute('src', expect.stringContaining('catalog-en-US.png'))
        await act(async () => { await i18n.changeLanguage('pt-BR') })
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Seu mercado de itens para aventuras de D&D')
        expect(screenshot).toHaveAttribute('src', expect.stringContaining('catalog-pt-BR.png'))
        expect(screenshot).toHaveAttribute('alt', expect.stringContaining('Captura real'))
        expect(screen.getByRole('link', { name: 'Conhecer recursos' })).toHaveAttribute('href', '#home-resources')
    })
})
