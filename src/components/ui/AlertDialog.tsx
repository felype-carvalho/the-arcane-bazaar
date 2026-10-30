import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { ModalDialog } from './ModalDialog'

interface AlertDialogProps {
    title: string
    message: string
    onCancel: () => void
    onConfirm: () => void
}

export function AlertDialog({ title, message, onCancel, onConfirm }: AlertDialogProps) {
    return createPortal(
        <ModalDialog
            dialogWidth="min(480px, 100%)"
            eyebrow="Warning"
            icon={<AlertTriangle size={20} />}
            onClose={onCancel}
            title={title}
            titleId="shared-alert-title"
        >
            <p className="text-sm leading-6 text-cream">{message}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
                <button type="button" className="primary-button" onClick={onConfirm}>Continue</button>
            </div>
        </ModalDialog>,
        document.body,
    )
}
