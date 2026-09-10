import { Settings } from 'lucide-react'
import { ToolbarDialog } from './ToolbarDialog'

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  return (
    <ToolbarDialog
      eyebrow="System"
      icon={<Settings size={20} />}
      onClose={onClose}
      title="Settings"
      titleId="settings-modal-title"
    />
  )
}
