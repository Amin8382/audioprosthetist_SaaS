import type { SupplierOfferStatus } from '../../offer/types/supplierOffer'
import type { QuotationRequestSummaryResponse } from '../types/quotationRequest'

export function getQuotationId(request: QuotationRequestSummaryResponse) {
  return request.quotationRequestId ?? request.id
}

export function getClinicName(request: QuotationRequestSummaryResponse) {
  return request.clinic?.name ?? request.clinicName
}

export function getClinicId(request: QuotationRequestSummaryResponse) {
  return request.clinic?.id ?? request.clinicId
}

export function getSupplierName(request: QuotationRequestSummaryResponse) {
  return request.supplier?.name ?? request.supplierName
}

export function getSupplierId(request: QuotationRequestSummaryResponse) {
  return request.supplier?.id ?? request.supplierId
}

export function getOfferStateLabel(request: QuotationRequestSummaryResponse) {
  if (request.status === 'DRAFT') {
    return 'Brouillon'
  }

  if (request.status === 'CANCELLED') {
    return 'Demande annulee'
  }

  if (request.status === 'EXPIRED') {
    return 'Demande expiree'
  }

  if (!request.hasOffer || !request.offerStatus) {
    return "Envoyee - en attente d'offre"
  }

  const labels: Record<SupplierOfferStatus, string> = {
    DRAFT: 'Offre en preparation',
    SUBMITTED: 'Offre recue',
    ACCEPTED: 'Offre acceptee',
    REJECTED: 'Offre refusee',
    WITHDRAWN: 'Offre retiree',
    EXPIRED: 'Offre expiree',
  }

  return labels[request.offerStatus]
}

export function getLatestQuotationActivityDate(request: QuotationRequestSummaryResponse) {
  return (
    request.offerDecisionAt ??
    request.offerSubmittedAt ??
    request.sentAt ??
    request.createdAt
  )
}
