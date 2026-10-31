import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import i18n, { changeLanguage, initialLanguage, LANGUAGE_STORAGE_KEY, resetLanguage } from './index'
import { english, portuguese, type InterfaceKey } from './resources'
import { labelKeys } from './label-keys'
import { Toolbar } from '@/components/layout/toolbar/Toolbar'
import { SettingsProvider, type SettingsStorage } from '@/features/settings'
import { CurrencyDisplay } from '@/features/catalog/components/pricing/CurrencyDisplay'
import { ItemDetails } from '@/features/catalog/components/item/ItemDetails'
import { ItemModal } from '@/features/catalog/components/item/ItemModal'
import { FilterPanel } from '@/features/catalog/components/filters/FilterPanel'
import { ItemInformationValue } from '@/features/catalog/components/item/ItemInformationValue'
import { SourceChip } from '@/features/catalog/components/item/SourceChip'
import { DEFAULT_MODIFIERS } from '@/features/catalog/model/pricing'
import { ITEM_FIXTURES } from '@/features/catalog/test/fixtures/items'
import type { Item, ItemFilters } from '@/features/catalog/types'

beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en-US')
})

afterEach(async () => {
    vi.restoreAllMocks()
    localStorage.clear()
    await i18n.changeLanguage('en-US')
})

const storage: SettingsStorage = {
    load: async () => ({ selectedSources: [] }),
    save: async () => undefined,
    reset: async () => ({ selectedSources: [] }),
}

describe('interface language', () => {
    it('has equivalent translation resources', () => {
        expect(Object.keys(portuguese).sort()).toEqual(Object.keys(english).sort())
        for (const key of Object.keys(english) as InterfaceKey[]) {
            const placeholders = (value: string) => value.match(/\{\{\w+\}\}/g)?.sort() ?? []
            expect(portuguese[key].trim(), key).not.toBe('')
            expect(placeholders(portuguese[key]), key).toEqual(placeholders(english[key]))
        }
    })

    it('uses semantic keys independently of editable English text', async () => {
        expect(i18n.exists('toolbar.settings')).toBe(true)
        expect(labelKeys.Weapon).toBe('classification.category.weapon')
        i18n.addResource('en-US', 'translation', 'classification.category.weapon', 'Weapon equipment')
        try {
            render(<FilterPanel filters={{ search: '', types: ['Magic'], rarities: [], categories: [], sources: [], availabilities: [] }} availableRarities={[]} availableCategories={['Weapon']} availableSources={[]} onSearch={vi.fn()} onTypeSelect={vi.fn()} onToggle={vi.fn()} onCategorySelect={vi.fn()} onSourceSelect={vi.fn()} onClear={vi.fn()} />)
            expect(screen.getByRole('button', { name: /Weapon equipment/ })).toBeInTheDocument()
            await act(() => changeLanguage('pt-BR'))
            expect(screen.getByRole('button', { name: /Arma/ })).toBeInTheDocument()
        } finally {
            i18n.addResource('en-US', 'translation', 'classification.category.weapon', 'Weapon')
        }
    })

    it('detects Portuguese browsers, validates saved choices and uses English otherwise', () => {
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-PT')
        expect(initialLanguage()).toBe('pt-BR')
        localStorage.setItem(LANGUAGE_STORAGE_KEY, 'invalid')
        expect(initialLanguage()).toBe('pt-BR')
        localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en-US')
        expect(initialLanguage()).toBe('en-US')
        localStorage.clear()
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR')
        expect(initialLanguage()).toBe('en-US')
    })

    it('persists choices, updates metadata, and resets to the browser language', async () => {
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
        await changeLanguage('pt-BR')
        expect(initialLanguage()).toBe('pt-BR')
        expect(document.documentElement.lang).toBe('pt-BR')
        expect(document.title).toContain('Guia de Preços')
        await resetLanguage()
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
        expect(i18n.language).toBe('en-US')
    })

    it('continues switching and resetting when storage is unavailable', async () => {
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
        for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
            vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error('Storage disabled') })
        }
        expect(initialLanguage()).toBe('en-US')
        render(<CurrencyDisplay valueGp={4000.002} />)
        await act(() => changeLanguage('pt-BR'))
        expect(screen.getByText('4.000 PO')).toBeInTheDocument()
        expect(screen.getByText('0,2 PC')).toBeInTheDocument()
        await act(() => resetLanguage())
        expect(screen.getByText('4,000 GP')).toBeInTheDocument()
    })

    it('updates an open dialog and existing validation errors, preserving user profile names', async () => {
        render(<SettingsProvider storage={storage}><Toolbar /></SettingsProvider>)
        fireEvent.click(screen.getByRole('button', { name: 'Open system menu' }))
        fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }))
        fireEvent.click(screen.getByRole('button', { name: 'Profile' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Create profile' })).toBeEnabled())
        fireEvent.click(screen.getByRole('button', { name: 'Create profile' }))
        await screen.findByText('Enter a profile name.')
        await act(() => changeLanguage('pt-BR'))
        expect(await screen.findByRole('dialog', { name: 'Configurações' })).toBeInTheDocument()
        expect(screen.getByText('Insira um nome de perfil.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Padrão (ativo)' })).toBeInTheDocument()
        fireEvent.change(screen.getByRole('textbox', { name: 'Nome do novo perfil' }), { target: { value: 'Magic' } })
        fireEvent.click(screen.getByRole('button', { name: 'Criar perfil' }))
        await screen.findByRole('button', { name: 'Magic (ativo)' })
        expect(screen.getByRole('button', { name: 'Renomear Magic' })).toBeInTheDocument()
    })

    it('resets the language through local data reset', async () => {
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
        await changeLanguage('pt-BR')
        render(<SettingsProvider storage={storage}><Toolbar /></SettingsProvider>)
        fireEvent.click(screen.getByRole('button', { name: 'Abrir menu do sistema' }))
        fireEvent.click(screen.getByRole('menuitem', { name: 'Configurações' }))
        fireEvent.click(await screen.findByRole('button', { name: 'Redefinir dados locais' }))
        fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
        expect(await screen.findByText('Local data reset to defaults.')).toBeInTheDocument()
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
        expect(document.documentElement.lang).toBe('en-US')
    })

    it('translates structured field labels without changing item content', async () => {
        render(<ItemModal item={{ ...ITEM_FIXTURES[0], name: 'English Item', weaponInformation: [{ label: 'Base Damage', value: '1d6 fire' }] }} onClose={vi.fn()} />)
        await act(() => changeLanguage('pt-BR'))
        expect(screen.getByText('English Item')).toBeInTheDocument()
        expect(screen.getByText('Dano Base')).toBeInTheDocument()
        expect(screen.getByText('1d6 fire')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Fechar ficha do item' })).toBeInTheDocument()
    })

    it('localizes structured numeric costs and source tooltips without translating publication names', async () => {
        render(<><ItemInformationValue field="Personal Travel Cost" value="1,200.5 GP per mile per passenger" /><SourceChip source="PHB" /></>)
        await act(() => changeLanguage('pt-BR'))
        expect(screen.getByText('1.200,5 PO por milha por passageiro')).toBeInTheDocument()
        expect(screen.getByTitle("Fonte: Player's Handbook (2014)")).toBeInTheDocument()
    })

    it('preserves filter values while translating their labels', async () => {
        const onTypeSelect = vi.fn()
        const filters: ItemFilters = { search: 'Sword', types: ['Magic'], rarities: ['Uncommon'], categories: ['Weapon'], sources: [], availabilities: [] }
        render(<FilterPanel filters={filters} availableRarities={['Uncommon']} availableCategories={['Weapon']} availableSources={[]} onSearch={vi.fn()} onTypeSelect={onTypeSelect} onToggle={vi.fn()} onCategorySelect={vi.fn()} onSourceSelect={vi.fn()} onClear={vi.fn()} />)
        await act(() => changeLanguage('pt-BR'))
        expect(screen.getByRole('textbox', { name: 'Buscar itens' })).toHaveValue('Sword')
        expect(screen.getByRole('radio', { name: /Mágico/ })).toBeChecked()
        expect(screen.getByRole('button', { name: /Arma/ })).toHaveAttribute('aria-pressed', 'true')
        fireEvent.click(screen.getByRole('radio', { name: /Mundano/ }))
        expect(onTypeSelect).toHaveBeenCalledWith('Common')
    })

    it('preserves variant selection, modifier values and calculated prices across a language switch', async () => {
        const baseItem = { ...ITEM_FIXTURES[0], type: 'Magic' as const, basePriceGp: 100 }
        const option = { id: 'base', baseItemId: 'base', baseName: 'Longsword', baseSource: 'PHB', basePriceGp: 15, variantPriceGp: 85, effectivePriceGp: 100, resolvedItem: baseItem }
        const item: Item = { ...baseItem, variantOptions: [option] }
        function Harness() {
            const [modifiers, setModifiers] = useState(DEFAULT_MODIFIERS)
            const [manualPrice, setManualPrice] = useState('')
            return <ItemDetails item={item} selectedVariantOption={option} onVariantOptionSelect={vi.fn()} onGroupOptionSelect={vi.fn()} onOpenModal={vi.fn()} modifiers={modifiers} setModifiers={setModifiers} manualPrice={manualPrice} setManualPrice={setManualPrice} />
        }
        render(<Harness />)
        fireEvent.click(screen.getByText('Price modifiers'))
        fireEvent.change(screen.getByRole('combobox', { name: 'Economy' }), { target: { value: 'prosperous' } })
        expect(screen.getByText('120 GP')).toBeInTheDocument()
        expect(screen.getByText('60 GP')).toBeInTheDocument()
        await act(() => changeLanguage('pt-BR'))
        expect(screen.getByRole('combobox', { name: 'Item base compatível' })).toHaveValue('base')
        expect(screen.getByRole('combobox', { name: 'Economia' })).toHaveValue('prosperous')
        expect(screen.getByText('120 PO')).toBeInTheDocument()
        expect(screen.getByText('60 PO')).toBeInTheDocument()
        expect(screen.getByText('Economia · Economia Próspera')).toBeInTheDocument()
        expect(within(screen.getByRole('combobox', { name: 'Economia' })).getByRole('option', { name: /Economia Próspera/ })).toBeInTheDocument()
    })
})
