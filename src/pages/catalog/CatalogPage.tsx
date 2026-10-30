import { Catalog } from '@/features/catalog'
import { useSettings } from '@/features/settings'

export function CatalogPage() {
  const { settings, catalog, activeProfileId, resetVersion, updateCatalog, isReady } = useSettings()

  return <Catalog key={`${activeProfileId}-${resetVersion}`} selectedSources={settings.selectedSources} settingsReady={isReady} preferences={catalog} onPreferencesChange={updateCatalog} />
}
