import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { CatalogPage } from '@/pages/catalog'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/catalog" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/catalog" element={<CatalogPage />} />
      </Route>
    </Routes>
  )
}
