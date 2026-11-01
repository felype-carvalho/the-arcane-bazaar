import { Store } from 'lucide-react'
import { useInterfaceTranslation } from '@/app/i18n'
import { ModalDialog } from '@/components/ui/ModalDialog'

interface MerchantNoticeModalProps {
    onClose: () => void
}

export function MerchantNoticeModal({ onClose }: MerchantNoticeModalProps) {
    const { t } = useInterfaceTranslation()

    return (
        <ModalDialog
            dialogWidth="min(480px, 100%)"
            eyebrow={t('common.system')}
            icon={<Store size={20} aria-hidden="true" />}
            onClose={onClose}
            title={t('navigation.merchant')}
            titleId="merchant-notice-title"
        >
            <p className="text-sm text-cream">{t('merchant.comingSoon')}</p>
        </ModalDialog>
    )
}
