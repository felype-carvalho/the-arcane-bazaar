import { useInterfaceTranslation } from '@/app/i18n'

export function HomePage() {
    const { t } = useInterfaceTranslation()

    return <main aria-label={t('navigation.home')} className="min-h-0 flex-1" />
}
