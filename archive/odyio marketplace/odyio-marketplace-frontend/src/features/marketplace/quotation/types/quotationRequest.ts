import type { OrderStatus } from '../../order/types/order'
import type { SupplierOfferStatus } from '../../offer/types/supplierOffer'

export type QuotationRequestStatus = 'DRAFT' | 'SENT' | 'CANCELLED' | 'EXPIRED'
export type SupplierQuotationWorkflowStatus = 'TO_PROCESS' | 'ANSWERED' | 'CANCELLED'

export type QuotationActorSummary = {
  id: string
  name: string
}

export type QuotationRequestLineCreateRequest = {
  productId: string
  quantity: number
  lineNotes?: string | null
}

export type QuotationRequestCreateRequest = {
  clinicId: string
  supplierId: string
  clinicNotes?: string | null
  requestedDeliveryDate?: string | null
  lines: QuotationRequestLineCreateRequest[]
}

export type QuotationRequestLineResponse = {
  id: string
  productId: string
  productName: string
  productReference?: string | null
  quantity: number
  lineNotes?: string | null
}

export type QuotationRequestResponse = {
  id: string
  clinicId: string
  clinicName: string
  supplierId: string
  supplierName: string
  status: QuotationRequestStatus
  clinicNotes?: string | null
  requestedDeliveryDate?: string | null
  sentAt?: string | null
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
  lines: QuotationRequestLineResponse[]
  hasOffer?: boolean
  offerId?: string | null
  offerStatus?: SupplierOfferStatus | null
  offerSubmittedAt?: string | null
  offerDecisionAt?: string | null
  hasOrder?: boolean
  orderId?: string | null
  orderStatus?: OrderStatus | null
  orderNumber?: string | null
}

export type QuotationRequestSummaryResponse = {
  id: string
  quotationRequestId?: string
  clinic?: QuotationActorSummary
  clinicId: string
  clinicName: string
  supplier?: QuotationActorSummary
  supplierId: string
  supplierName: string
  status: QuotationRequestStatus
  lineCount: number
  totalRequestedQuantity?: number
  hasOffer?: boolean
  offerId?: string | null
  offerStatus?: SupplierOfferStatus | null
  offerSubmittedAt?: string | null
  offerDecisionAt?: string | null
  hasOrder?: boolean
  orderId?: string | null
  orderStatus?: OrderStatus | null
  orderNumber?: string | null
  requestedDeliveryDate?: string | null
  sentAt?: string | null
  createdAt: string
}

export type QuotationDraftLine = {
  productId: string
  productName: string
  productReference?: string | null
  quantity: number
  lineNotes: string
}

export type QuotationDraft = {
  clinicId?: string
  clinicName?: string
  supplierId?: string
  supplierName?: string
  lines: QuotationDraftLine[]
}

export const quotationStatusLabels: Record<QuotationRequestStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyee',
  CANCELLED: 'Annulee',
  EXPIRED: 'Expiree',
}
