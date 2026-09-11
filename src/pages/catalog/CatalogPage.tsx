import { Catalog } from '@/features/catalog'
import { useSettings } from '@/features/settings'

export function CatalogPage() {
  const { settings, isReady } = useSettings()

  return <Catalog selectedSources={settings.selectedSources} settingsReady={isReady} />
}
