import type { SupplierOfferStatus } from '../types/supplierOffer'
import { supplierOfferStatusLabels } from '../types/supplierOffer'

type SupplierOfferStatusBadgeProps = {
  status: SupplierOfferStatus
}

const statusClasses: Record<SupplierOfferStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-teal-50 text-teal-800',
  ACCEPTED: 'bg-emerald-50 text-emerald-800',
  REJECTED: 'bg-red-50 text-red-800',
  WITHDRAWN: 'bg-slate-100 text-slate-700',
  EXPIRED: 'bg-amber-50 text-amber-800',
}

export default function SupplierOfferStatusBadge({ status }: SupplierOfferStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}
      aria-label={`Statut de l'offre: ${supplierOfferStatusLabels[status]}`}
    >
      {supplierOfferStatusLabels[status]}
    </span>
  )
}
