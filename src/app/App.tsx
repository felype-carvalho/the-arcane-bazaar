import { AppRoutes } from '@/routes/AppRoutes'
import { SettingsProvider } from '@/features/settings'

export default function App() {
  return (
    <SettingsProvider>
      <AppRoutes />
    </SettingsProvider>
  )
}
