import { useCallback, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type PendingConfirm = ConfirmOptions & {
  resolve: (confirmed: boolean) => void
}

export function useConfirmDialog() {
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPendingConfirm({ ...options, resolve })
    })
  }, [])

  const close = useCallback(
    (confirmed: boolean) => {
      if (!pendingConfirm) {
        return
      }

      pendingConfirm.resolve(confirmed)
      setPendingConfirm(null)
    },
    [pendingConfirm],
  )

  return {
    confirm,
    dialog: pendingConfirm ? (
      <ConfirmDialog
        open
        title={pendingConfirm.title}
        message={pendingConfirm.message}
        confirmLabel={pendingConfirm.confirmLabel}
        cancelLabel={pendingConfirm.cancelLabel}
        destructive={pendingConfirm.destructive}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    ) : null,
  }
}
