import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { CatalogRoute } from '@/pages/catalog/CatalogRoute'
import { HomePage } from '@/pages/home'

export function AppRoutes() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<CatalogRoute />} />
                <Route path="/merchant" element={<Navigate to="/" replace state={{ showMerchantNotice: true }} />} />
            </Route>
        </Routes>
    )
}
