import { httpClient } from '../../../../shared/api/httpClient'
import type { MarketplaceNotification, NotificationQueryOptions } from '../types/notification'

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  clinic: (clinicId: string, options?: NotificationQueryOptions) =>
    ['notifications', 'clinic', clinicId, options ?? {}] as const,
  supplier: (supplierId: string, options?: NotificationQueryOptions) =>
    ['notifications', 'supplier', supplierId, options ?? {}] as const,
}

export async function getClinicNotifications(
  clinicId: string,
  options?: NotificationQueryOptions,
) {
  const response = await httpClient.get<MarketplaceNotification[]>(
    `/notifications/clinic/${clinicId}`,
    { params: options },
  )
  return response.data
}

export async function getSupplierNotifications(
  supplierId: string,
  options?: NotificationQueryOptions,
) {
  const response = await httpClient.get<MarketplaceNotification[]>(
    `/notifications/supplier/${supplierId}`,
    { params: options },
  )
  return response.data
}
