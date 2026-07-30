import { httpClient } from '../../../../shared/api/httpClient'
import type { Order, OrderStatus, OrderSummary } from '../types/order'

export const orderQueryKeys = {
  clinicList: (clinicId: string, status?: OrderStatus) =>
    ['orders', 'clinic', clinicId, status ?? 'all'] as const,
  supplierList: (supplierId: string, status?: OrderStatus) =>
    ['orders', 'supplier', supplierId, status ?? 'all'] as const,
  clinicDetail: (clinicId: string, orderId: string) =>
    ['order', 'clinic', clinicId, orderId] as const,
  supplierDetail: (supplierId: string, orderId: string) =>
    ['order', 'supplier', supplierId, orderId] as const,
}

export async function createOrderFromOffer(offerId: string, clinicId: string) {
  const response = await httpClient.post<Order>(`/orders/from-offer/${offerId}`, undefined, {
    params: { clinicId },
  })
  return response.data
}

export async function confirmOrder(orderId: string, supplierId: string) {
  const response = await httpClient.patch<Order>(`/orders/${orderId}/confirm`, undefined, {
    params: { supplierId },
  })
  return response.data
}

export async function cancelOrder(orderId: string, clinicId: string, reason?: string | null) {
  const trimmedReason = reason?.trim()
  const response = await httpClient.patch<Order>(
    `/orders/${orderId}/cancel`,
    trimmedReason ? { reason: trimmedReason } : undefined,
    {
      params: { clinicId },
    },
  )
  return response.data
}

export async function getClinicOrders(clinicId: string, status?: OrderStatus) {
  const response = await httpClient.get<OrderSummary[]>(`/orders/clinic/${clinicId}`, {
    params: status ? { status } : undefined,
  })
  return response.data
}

export async function getSupplierOrders(supplierId: string, status?: OrderStatus) {
  const response = await httpClient.get<OrderSummary[]>(`/orders/supplier/${supplierId}`, {
    params: status ? { status } : undefined,
  })
  return response.data
}

export async function getClinicOrder(clinicId: string, orderId: string) {
  const response = await httpClient.get<Order>(`/orders/clinic/${clinicId}/${orderId}`)
  return response.data
}

export async function getSupplierOrder(supplierId: string, orderId: string) {
  const response = await httpClient.get<Order>(`/orders/supplier/${supplierId}/${orderId}`)
  return response.data
}
