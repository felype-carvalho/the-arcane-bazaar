import { ExternalLink, Info, createLucideIcon } from 'lucide-react'
import packageMetadata from '../../../../package.json'
import { ModalDialog } from '@/components/ui/ModalDialog'

const GITHUB_URL = 'https://github.com/felype-carvalho/the-arcane-bazaar'
const Github = createLucideIcon('Github', [
    ['path', { d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4', key: 'outline' }],
    ['path', { d: 'M9 18c-4.51 2-5-2-7-2', key: 'tail' }],
])

interface SystemInfoModalProps {
    onClose: () => void
}

export function SystemInfoModal({ onClose }: SystemInfoModalProps) {
    return (
        <ModalDialog
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
        </ModalDialog>
    )
}
