export type NotificationActorType = 'CLINIC' | 'SUPPLIER'

export type MarketplaceNotification = {
  id: string
  actorType: NotificationActorType
  type: string
  title: string
  message: string
  createdAt: string
  targetUrl?: string | null
  entityType?: string | null
  entityId?: string | null
}

export type NotificationQueryOptions = {
  limit?: number
  since?: string
  type?: string
}
