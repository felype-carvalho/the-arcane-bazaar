import { Component, lazy, Suspense, type ReactNode } from 'react'
import { useInterfaceTranslation } from '@/app/i18n'

const CatalogPage = lazy(() => import('./CatalogPage').then((module) => ({ default: module.CatalogPage })))

function CatalogStatus({ failed = false }: { failed?: boolean }) {
    const { t } = useInterfaceTranslation()
    return <main className="grid min-h-0 flex-1 place-items-center p-6 text-center" role="status">
        <div>
            <p className="font-display text-sm text-muted">{t(failed ? 'catalog.loadError' : 'catalog.loading')}</p>
            {failed && <button type="button" className="secondary-button mt-4" onClick={() => window.location.reload()}>{t('common.retry')}</button>}
        </div>
    </main>
}

class CatalogBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    render() {
        return this.state.failed ? <CatalogStatus failed /> : this.props.children
    }
}

export function CatalogRoute() {
    return <CatalogBoundary><Suspense fallback={<CatalogStatus />}><CatalogPage /></Suspense></CatalogBoundary>
}
