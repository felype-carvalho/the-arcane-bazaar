import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { resources } from './resources'
import { labelKeys } from './label-keys'

export type Language = 'en-US' | 'pt-BR'
export const LANGUAGE_STORAGE_KEY = 'the-arcane-bazaar:language'

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'translation'
        resources: typeof resources['en-US']
        keySeparator: false
    }
}

export function browserLanguage(): Language {
    return typeof navigator !== 'undefined' && /^pt(?:-|$)/i.test(navigator.language) ? 'pt-BR' : 'en-US'
}

export function initialLanguage(): Language {
    try {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
        if (saved === 'en-US' || saved === 'pt-BR') return saved
    } catch { /* Storage may be disabled; language remains available in memory. */ }
    return browserLanguage()
}

function updateDocument(language: string) {
    if (typeof document === 'undefined') return
    document.documentElement.lang = language
    document.title = `The Arcane Bazaar — ${i18n.t("toolbar.subtitle")}`
}

i18n.on('languageChanged', updateDocument)
void i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage(),
    fallbackLng: 'en-US',
    supportedLngs: ['en-US', 'pt-BR'],
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    interpolation: { escapeValue: false },
})

export async function changeLanguage(language: Language): Promise<void> {
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language) } catch { /* Session-only choice. */ }
    await i18n.changeLanguage(language)
}

export async function resetLanguage(): Promise<void> {
    try { localStorage.removeItem(LANGUAGE_STORAGE_KEY) } catch { /* Storage may be disabled. */ }
    await i18n.changeLanguage(browserLanguage())
}

export function useInterfaceTranslation() {
    const { t, i18n: instance } = useTranslation()
    // Structured labels and stored error messages are looked up only at presentation time.
    const label = (value: string): string => Object.hasOwn(labelKeys, value)
        ? t(labelKeys[value as keyof typeof labelKeys])
        : value
    const message = (value: string): string => value.split(': ').map(label).join(': ')
    const number = (value: number): string => new Intl.NumberFormat(instance.language, { maximumFractionDigits: 3 }).format(value)
    const percent = (value: number): string => `${value > 0 ? '+' : ''}${number(value)}%`
    return { t, label, message, number, percent, language: instance.language }
}

export default i18n
