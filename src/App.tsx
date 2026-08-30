import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Toolbar } from './components/toolbar/Toolbar'
import { CatalogPage } from './pages/catalog'

function AppLayout() {
  return (
    <div className="flex h-dvh min-h-[620px] flex-col overflow-hidden bg-app text-cream">
      <Toolbar />
      <Outlet />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/catalog" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/catalog" element={<CatalogPage />} />
      </Route>
    </Routes>
  )
}
