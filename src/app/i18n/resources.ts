import english from './locales/en-US.json'
import portuguese from './locales/pt-BR.json'

export type InterfaceKey = keyof typeof english

export { english, portuguese }

export const resources = {
    'en-US': { translation: english },
    'pt-BR': { translation: portuguese satisfies Record<InterfaceKey, string> },
}
