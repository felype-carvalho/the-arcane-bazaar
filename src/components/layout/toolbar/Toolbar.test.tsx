import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SettingsProvider, type SettingsStorage } from '@/features/settings'
import { ALL_SOURCE_CODES } from '@/features/catalog'
import packageMetadata from '../../../../package.json'
import { Toolbar } from './Toolbar'
import i18n, { LANGUAGE_STORAGE_KEY } from '@/app/i18n'

const storage: SettingsStorage = {
  load: async () => ({ selectedSources: [...ALL_SOURCE_CODES] }),
  save: async () => undefined,
  reset: async () => ({ selectedSources: [...ALL_SOURCE_CODES] }),
}

function renderToolbar() {
  return render(<SettingsProvider storage={storage}><Toolbar /></SettingsProvider>)
}

describe('Toolbar', () => {
    it('opens the language submenu on hover and persists a selected language', async () => {
        const user = userEvent.setup()
        renderToolbar()
        expect(screen.queryByRole('menuitem', { name: 'Language' })).not.toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Open system menu' }))
        const menu = screen.getByRole('menu', { name: 'System menu' })
        const languageButton = within(menu).getByRole('menuitem', { name: 'Language' })
        expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual([' Settings', 'Language', ' About'])
        expect(screen.queryByRole('menu', { name: 'Language' })).not.toBeInTheDocument()

        try {
            await user.hover(languageButton)
            expect(languageButton).toHaveAttribute('aria-expanded', 'true')
            const languageMenu = screen.getByRole('menu', { name: 'Language' })
            expect(within(languageMenu).getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
            await user.click(within(languageMenu).getByRole('menuitemradio', { name: 'Português' }))
            expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('pt-BR')
            expect(screen.queryByRole('menu')).not.toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Abrir menu do sistema' })).toHaveFocus()
            await user.click(screen.getByRole('button', { name: 'Abrir menu do sistema' }))
            await user.click(screen.getByRole('menuitem', { name: 'Idioma' }))
            expect(screen.getByRole('menuitemradio', { name: 'Português' })).toHaveAttribute('aria-checked', 'true')
            await user.click(screen.getByRole('heading', { name: 'The Arcane Bazaar' }))
            expect(screen.queryByRole('menu')).not.toBeInTheDocument()
        } finally {
            await act(() => i18n.changeLanguage('en-US'))
            localStorage.removeItem(LANGUAGE_STORAGE_KEY)
        }
    })

    it('dismisses the submenu on mouse leave and supports keyboard navigation', async () => {
        const user = userEvent.setup()
        renderToolbar()
        await user.click(screen.getByRole('button', { name: 'Open system menu' }))
        const languageButton = screen.getByRole('menuitem', { name: 'Language' })
        await user.hover(languageButton)
        expect(screen.getByRole('menu', { name: 'Language' })).toBeInTheDocument()
        await user.unhover(languageButton)
        await waitFor(() => expect(screen.queryByRole('menu', { name: 'Language' })).not.toBeInTheDocument())

        languageButton.focus()
        await user.keyboard('{ArrowLeft}')
        expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus()
        await user.keyboard('{ArrowDown}')
        expect(screen.getByRole('menuitemradio', { name: 'Português' })).toHaveFocus()
        await user.keyboard('{Home}')
        expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveFocus()
        await user.keyboard('{End}')
        expect(screen.getByRole('menuitemradio', { name: 'Português' })).toHaveFocus()
        await user.keyboard('{ArrowRight}')
        expect(languageButton).toHaveFocus()
        expect(screen.queryByRole('menu', { name: 'Language' })).not.toBeInTheDocument()
        await user.keyboard('{Enter}{Escape}')
        expect(languageButton).toHaveFocus()
        expect(screen.getByRole('menu', { name: 'System menu' })).toBeInTheDocument()
        await user.keyboard('{Escape}')
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Open system menu' })).toHaveFocus()
    })

  it('opens and closes the settings modal', async () => {
    const user = userEvent.setup()
    renderToolbar()

    const menuButton = screen.getByRole('button', { name: 'Open system menu' })
    await user.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('menuitem', { name: 'Settings' }))

    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(dialog).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close settings' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the version and GitHub repository in the information modal', async () => {
    const user = userEvent.setup()
    renderToolbar()

    await user.click(screen.getByRole('button', { name: 'Open system menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'About' }))
    const dialog = screen.getByRole('dialog', { name: 'About The Arcane Bazaar' })

    expect(within(dialog).getByText(packageMetadata.version)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /View repository/ })).toHaveAttribute('href', 'https://github.com/felype-carvalho/the-arcane-bazaar')
  })
})
