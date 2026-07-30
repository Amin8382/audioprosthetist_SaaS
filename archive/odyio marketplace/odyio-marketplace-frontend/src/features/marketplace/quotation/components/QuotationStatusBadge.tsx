import type { QuotationRequestStatus } from '../types/quotationRequest'
import { quotationStatusLabels } from '../types/quotationRequest'

type QuotationStatusBadgeProps = {
  status: QuotationRequestStatus
}

const statusClasses: Record<QuotationRequestStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-teal-50 text-teal-800',
  CANCELLED: 'bg-red-50 text-red-800',
  EXPIRED: 'bg-amber-50 text-amber-800',
}

export default function QuotationStatusBadge({ status }: QuotationStatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {quotationStatusLabels[status]}
    </span>
  )
}
