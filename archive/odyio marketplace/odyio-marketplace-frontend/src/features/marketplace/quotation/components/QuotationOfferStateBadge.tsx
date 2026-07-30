import type { QuotationRequestSummaryResponse } from '../types/quotationRequest'
import { getOfferStateLabel } from '../utils/quotationSummary'

type QuotationOfferStateBadgeProps = {
  request: QuotationRequestSummaryResponse
}

export default function QuotationOfferStateBadge({ request }: QuotationOfferStateBadgeProps) {
  const tone =
    request.offerStatus === 'ACCEPTED'
      ? 'bg-teal-50 text-teal-800'
      : request.offerStatus === 'REJECTED' || request.offerStatus === 'WITHDRAWN'
        ? 'bg-red-50 text-red-700'
        : request.offerStatus === 'SUBMITTED'
          ? 'bg-blue-50 text-blue-800'
          : request.status === 'CANCELLED' || request.status === 'EXPIRED'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-amber-50 text-amber-800'

  return (
    <span className={['inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', tone].join(' ')}>
      {getOfferStateLabel(request)}
    </span>
  )
}
