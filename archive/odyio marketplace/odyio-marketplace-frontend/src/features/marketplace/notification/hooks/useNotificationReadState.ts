import { useEffect, useMemo, useState } from 'react'
import type { NotificationActorType } from '../types/notification'

const MAX_STORED_READ_IDS = 200

function getStorageKey(actorType?: NotificationActorType, actorId?: string | null) {
  if (!actorType || !actorId) {
    return null
  }

  return `odyio-marketplace-notifications-read-${actorType.toLowerCase()}-${actorId}`
}

function readStoredIds(storageKey: string | null) {
  if (!storageKey) {
    return new Set<string>()
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []
    return new Set(Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : [])
  } catch {
    return new Set<string>()
  }
}

function writeStoredIds(storageKey: string | null, ids: Set<string>) {
  if (!storageKey) {
    return
  }

  const boundedIds = Array.from(ids).slice(-MAX_STORED_READ_IDS)
  window.localStorage.setItem(storageKey, JSON.stringify(boundedIds))
}

export function useNotificationReadState(actorType?: NotificationActorType, actorId?: string | null) {
  const storageKey = getStorageKey(actorType, actorId)
  const [readIds, setReadIds] = useState<Set<string>>(() => readStoredIds(storageKey))

  useEffect(() => {
    setReadIds(readStoredIds(storageKey))
  }, [storageKey])

  const actions = useMemo(
    () => ({
      isRead: (notificationId: string) => readIds.has(notificationId),
      markRead: (notificationId: string) => {
        setReadIds((current) => {
          const next = new Set(current)
          next.add(notificationId)
          writeStoredIds(storageKey, next)
          return next
        })
      },
      markAllRead: (notificationIds: string[]) => {
        setReadIds((current) => {
          const next = new Set(current)
          notificationIds.forEach((notificationId) => next.add(notificationId))
          writeStoredIds(storageKey, next)
          return next
        })
      },
    }),
    [readIds, storageKey],
  )

  return {
    readIds,
    ...actions,
  }
}
