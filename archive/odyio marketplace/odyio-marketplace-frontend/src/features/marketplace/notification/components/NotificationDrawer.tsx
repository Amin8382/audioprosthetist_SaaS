import { useEffect, useRef } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDateTime } from '../../../../shared/utils/dateFormat'
import type { MarketplaceNotification } from '../types/notification'

type NotificationDrawerProps = {
  actorSubtitle: string
  notifications: MarketplaceNotification[]
  isLoading: boolean
  isError: boolean
  readIds: Set<string>
  onClose: () => void
  onRetry: () => void
  onMarkRead: (notificationId: string) => void
  onMarkAllRead: (notificationIds: string[]) => void
}

function isSupportedTargetUrl(targetUrl?: string | null) {
  return Boolean(targetUrl?.startsWith('/clinic/') || targetUrl?.startsWith('/supplier/'))
}

export default function NotificationDrawer({
  actorSubtitle,
  notifications,
  isLoading,
  isError,
  readIds,
  onClose,
  onRetry,
  onMarkRead,
  onMarkAllRead,
}: NotificationDrawerProps) {
  const navigate = useNavigate()
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const titleId = 'marketplace-notifications-title'

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleNotificationClick = (notification: MarketplaceNotification) => {
    onMarkRead(notification.id)
    onClose()

    if (isSupportedTargetUrl(notification.targetUrl)) {
      navigate(notification.targetUrl as string)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fermer les notifications"
        className="absolute inset-0 h-full w-full bg-slate-950/30"
        disabled={isLoading}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-slate-950">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-slate-600">{actorSubtitle}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <span className="text-sm text-slate-600">
            Les notifications sont generees par le backend et lues localement.
          </span>
          <button
            type="button"
            onClick={() => onMarkAllRead(notifications.map((notification) => notification.id))}
            disabled={notifications.length === 0}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:text-slate-400"
          >
            Tout marquer comme lu
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Chargement des notifications...
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              <p>Impossible de charger les notifications.</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reessayer
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
              Aucune notification pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const isUnread = !readIds.has(notification.id)

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={[
                      'w-full rounded-lg border p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/40',
                      isUnread
                        ? 'border-teal-200 bg-teal-50'
                        : 'border-slate-200 bg-white',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-slate-950">{notification.title}</h3>
                      {isUnread ? (
                        <span className="rounded-full bg-teal-700 px-2 py-0.5 text-xs font-semibold text-white">
                          Nouveau
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{notification.message}</p>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
