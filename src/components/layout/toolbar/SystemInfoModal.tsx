import { ExternalLink, Github, Info } from 'lucide-react'
import packageMetadata from '../../../../package.json'
import { ToolbarDialog } from './ToolbarDialog'

const GITHUB_URL = 'https://github.com/felype-carvalho/the-arcane-bazaar'

interface SystemInfoModalProps {
  onClose: () => void
}

export function SystemInfoModal({ onClose }: SystemInfoModalProps) {
  return (
    <ToolbarDialog
      eyebrow="System"
      icon={<Info size={20} />}
      onClose={onClose}
      title="About The Arcane Bazaar"
      titleId="system-info-modal-title"
    >
      <dl className="grid gap-4 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <dt className="text-muted">Version</dt>
          <dd className="font-display text-gold-bright">{packageMetadata.version}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2 text-muted"><Github size={17} /> GitHub</dt>
          <dd><a className="inline-flex items-center gap-1.5 text-gold hover:text-gold-bright" href={GITHUB_URL} target="_blank" rel="noreferrer">View repository <ExternalLink size={14} /></a></dd>
        </div>
      </dl>
    </ToolbarDialog>
  )
}
