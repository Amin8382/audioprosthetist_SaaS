import type { OrderStatus } from '../../order/types/order'

export type SupplierOfferStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'

export type SupplierOfferLineCreateRequest = {
  quotationRequestLineId: string
  unitPrice: number
  lineNotes?: string | null
}

export type SupplierOfferCreateRequest = {
  quotationRequestId: string
  supplierId: string
  supplierNotes?: string | null
  deliveryDelayDays: number
  validUntil: string
  lines: SupplierOfferLineCreateRequest[]
}

export type SupplierOfferUpdateRequest = {
  supplierNotes?: string | null
  deliveryDelayDays: number
  validUntil: string
  lines: SupplierOfferLineCreateRequest[]
}

export type SupplierOfferLine = {
  id: string
  quotationRequestLineId: string
  productId: string
  productName: string
  productReference?: string | null
  quantity: number
  unitPrice: number
  lineSubtotal: number
  lineNotes?: string | null
}

export type SupplierOffer = {
  id: string
  quotationRequestId: string
  clinicId: string
  clinicName: string
  supplierId: string
  supplierName: string
  status: SupplierOfferStatus
  supplierNotes?: string | null
  deliveryDelayDays: number
  validUntil: string
  submittedAt?: string | null
  decisionAt?: string | null
  rejectionReason?: string | null
  hasOrder?: boolean
  orderId?: string | null
  orderStatus?: OrderStatus | null
  orderNumber?: string | null
  createdAt: string
  updatedAt: string
  totalAmount: number
  lines: SupplierOfferLine[]
}

export type SupplierOfferSummary = {
  id: string
  quotationRequestId: string
  clinicId: string
  clinicName: string
  supplierId: string
  supplierName: string
  status: SupplierOfferStatus
  totalAmount: number
  deliveryDelayDays: number
  validUntil: string
  submittedAt?: string | null
  decisionAt?: string | null
  hasOrder?: boolean
  orderId?: string | null
  orderStatus?: OrderStatus | null
  orderNumber?: string | null
  createdAt: string
}

export const supplierOfferStatusLabels: Record<SupplierOfferStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
  WITHDRAWN: 'Retirée',
  EXPIRED: 'Expirée',
}
