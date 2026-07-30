export type OrderStatus = 'CREATED' | 'CONFIRMED' | 'CANCELLED'

export type OrderActorSummary = {
  id: string
  name: string
}

export type OrderLine = {
  id: string
  productId: string
  productName: string
  productReference?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  displayOrder: number
}

export type Order = {
  id: string
  orderNumber: string
  status: OrderStatus
  clinic: OrderActorSummary
  supplier: OrderActorSummary
  quotationRequestId: string
  supplierOfferId: string
  currency: string
  subtotal: number
  total: number
  deliveryDelayDays?: number | null
  validUntil?: string | null
  supplierNotes?: string | null
  createdAt: string
  confirmedAt?: string | null
  cancelledAt?: string | null
  cancellationReason?: string | null
  lines: OrderLine[]
}

export type OrderSummary = {
  id: string
  orderNumber: string
  status: OrderStatus
  clinic: OrderActorSummary
  supplier: OrderActorSummary
  quotationRequestId: string
  supplierOfferId: string
  currency: string
  total: number
  lineCount: number
  totalQuantity: number
  createdAt: string
  confirmedAt?: string | null
  cancelledAt?: string | null
}

export type CancelOrderInput = {
  reason?: string | null
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  CREATED: 'En attente de confirmation',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
}
