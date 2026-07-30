import { httpClient } from '../../../../shared/api/httpClient'
import type {
  SupplierOffer,
  SupplierOfferCreateRequest,
  SupplierOfferStatus,
  SupplierOfferSummary,
  SupplierOfferUpdateRequest,
} from '../types/supplierOffer'

export async function createOffer(payload: SupplierOfferCreateRequest) {
  const response = await httpClient.post<SupplierOffer>('/offers', payload)
  return response.data
}

export async function updateOffer(id: string, payload: SupplierOfferUpdateRequest) {
  const response = await httpClient.put<SupplierOffer>(`/offers/${id}`, payload)
  return response.data
}

export async function submitOffer(id: string) {
  const response = await httpClient.post<SupplierOffer>(`/offers/${id}/submit`)
  return response.data
}

export async function withdrawOffer(id: string) {
  const response = await httpClient.patch<SupplierOffer>(`/offers/${id}/withdraw`)
  return response.data
}

export async function acceptOffer(offerId: string, clinicId: string) {
  const response = await httpClient.patch<SupplierOffer>(`/offers/${offerId}/accept`, undefined, {
    params: { clinicId },
  })
  return response.data
}

export async function rejectOffer(offerId: string, clinicId: string, reason?: string | null) {
  const trimmedReason = reason?.trim()
  const response = await httpClient.patch<SupplierOffer>(
    `/offers/${offerId}/reject`,
    trimmedReason ? { reason: trimmedReason } : undefined,
    {
      params: { clinicId },
    },
  )
  return response.data
}

export async function getOffer(id: string) {
  const response = await httpClient.get<SupplierOffer>(`/offers/${id}`)
  return response.data
}

export async function getOfferByQuotationRequest(quotationRequestId: string) {
  const response = await httpClient.get<SupplierOffer>(
    `/offers/quotation-request/${quotationRequestId}`,
  )
  return response.data
}

export async function getSupplierOffers(supplierId: string, status?: SupplierOfferStatus) {
  const response = await httpClient.get<SupplierOfferSummary[]>(`/offers/supplier/${supplierId}`, {
    params: status ? { status } : undefined,
  })
  return response.data
}
