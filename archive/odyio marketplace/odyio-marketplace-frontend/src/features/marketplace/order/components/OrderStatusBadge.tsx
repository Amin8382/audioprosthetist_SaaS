import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import type { OrderStatus } from '../types/order'
import { orderStatusLabels } from '../types/order'

type OrderStatusBadgeProps = {
  status: OrderStatus
}

const statusClasses: Record<OrderStatus, string> = {
  CREATED: 'bg-amber-50 text-amber-900',
  CONFIRMED: 'bg-emerald-50 text-emerald-800',
  CANCELLED: 'bg-red-50 text-red-800',
}

const statusIcons = {
  CREATED: Clock3,
  CONFIRMED: CheckCircle2,
  CANCELLED: XCircle,
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const Icon = statusIcons[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
      aria-label={`Statut commande: ${orderStatusLabels[status]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {orderStatusLabels[status]}
    </span>
  )
}
