import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import {
  getClinicNotifications,
  getSupplierNotifications,
  notificationQueryKeys,
} from '../api/notificationApi'
import { useNotificationReadState } from '../hooks/useNotificationReadState'
import type { NotificationActorType } from '../types/notification'
import NotificationDrawer from './NotificationDrawer'

type NotificationBellProps = {
  actorType: NotificationActorType
  actorId?: string | null
  actorName?: string | null
}

export default function NotificationBell({ actorType, actorId, actorName }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement | null>(null)
  const wasOpenRef = useRef(false)
  const isEnabled = Boolean(actorId)
  const queryOptions = useMemo(() => ({ limit: 20 }), [])
  const queryKey =
    actorType === 'CLINIC'
      ? notificationQueryKeys.clinic(actorId ?? '', queryOptions)
      : notificationQueryKeys.supplier(actorId ?? '', queryOptions)

  const notificationsQuery = useQuery({
    queryKey,
    queryFn: () =>
      actorType === 'CLINIC'
        ? getClinicNotifications(actorId as string, queryOptions)
        : getSupplierNotifications(actorId as string, queryOptions),
    enabled: isEnabled,
    staleTime: 60_000,
  })

  const notifications = useMemo(
    () =>
      [...(notificationsQuery.data ?? [])].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [notificationsQuery.data],
  )
  const { readIds, markRead, markAllRead } = useNotificationReadState(actorType, actorId)
  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length
  const actorLabel = actorType === 'CLINIC' ? 'clinique' : 'fournisseur'
  const unreadLabel =
    unreadCount === 0
      ? 'Aucune notification non lue'
      : `${unreadCount > 99 ? '99+' : unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`

  useEffect(() => {
    setIsOpen(false)
  }, [actorId, actorType])

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      bellRef.current?.focus()
    }

    wasOpenRef.current = isOpen
  }, [isOpen])

  if (!isEnabled) {
    return null
  }

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`${unreadLabel} pour le ${actorLabel} actif`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <NotificationDrawer
          actorSubtitle={`${actorType === 'CLINIC' ? 'Clinique' : 'Fournisseur'}: ${actorName ?? actorId}`}
          notifications={notifications}
          isLoading={notificationsQuery.isLoading}
          isError={notificationsQuery.isError}
          readIds={readIds}
          onClose={() => setIsOpen(false)}
          onRetry={() => void notificationsQuery.refetch()}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      ) : null}
    </>
  )
}
