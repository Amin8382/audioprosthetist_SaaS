import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../../../../shared/components/EmptyState'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import { formatDateOnly, formatDateTime } from '../../../../shared/utils/dateFormat'
import { useActiveClinic } from '../../clinic/hooks/useActiveClinic'
import OrderStatusBadge from '../../order/components/OrderStatusBadge'
import { getQuotationRequestsByClinic } from '../api/quotationRequestApi'
import QuotationOfferStateBadge from '../components/QuotationOfferStateBadge'
import QuotationStatusBadge from '../components/QuotationStatusBadge'
import type { QuotationRequestStatus } from '../types/quotationRequest'
import {
  getLatestQuotationActivityDate,
  getQuotationId,
  getSupplierName,
} from '../utils/quotationSummary'

type StatusFilter = 'all' | QuotationRequestStatus

export default function QuotationRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { selectedClinicId, selectedClinicName } = useActiveClinic()
  const scopedStatus = statusFilter === 'all' ? undefined : statusFilter

  const quotationRequestsQuery = useQuery({
    queryKey: ['clinic-quotation-requests', selectedClinicId, scopedStatus],
    queryFn: () => getQuotationRequestsByClinic(selectedClinicId, scopedStatus),
    enabled: Boolean(selectedClinicId),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Demandes de devis
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Suivi des demandes</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Consultez les demandes de devis de la clinique active.
            {selectedClinicName ? ` Clinique: ${selectedClinicName}.` : ''}
          </p>
        </div>
        <Link
          to="/clinic/quotation-requests/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          <FileText className="h-4 w-4" />
          Nouvelle demande
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block max-w-xs">
          <span className="text-sm font-medium text-slate-700">Filtrer par statut</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="all">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SENT">Envoyee</option>
            <option value="CANCELLED">Annulee</option>
            <option value="EXPIRED">Expiree</option>
          </select>
        </label>
      </section>

      {!selectedClinicId ? (
        <EmptyState
          title="Aucune clinique active"
          message="Sélectionnez une clinique pour afficher ses demandes de devis."
        />
      ) : quotationRequestsQuery.isLoading ? (
        <LoadingState label="Chargement des demandes..." />
      ) : quotationRequestsQuery.isError ? (
        <ErrorState message="Impossible de charger les demandes de devis de cette clinique." />
      ) : (quotationRequestsQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Aucune demande de devis"
          message="Aucune demande ne correspond au filtre actuel."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Demande</th>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Offre</th>
                  <th className="px-4 py-3">Commande</th>
                  <th className="px-4 py-3">Lignes</th>
                  <th className="px-4 py-3">Quantite</th>
                  <th className="px-4 py-3">Livraison souhaitee</th>
                  <th className="px-4 py-3">Activite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(quotationRequestsQuery.data ?? []).map((request) => (
                  <tr key={getQuotationId(request)} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <Link
                        to={`/clinic/quotation-requests/${getQuotationId(request)}`}
                        className="font-semibold text-slate-950 hover:text-teal-800"
                      >
                        Demande {getQuotationId(request).slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{getSupplierName(request)}</td>
                    <td className="px-4 py-4">
                      <QuotationStatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-4">
                      <QuotationOfferStateBadge request={request} />
                    </td>
                    <td className="px-4 py-4">
                      {request.hasOrder && request.orderId ? (
                        <Link
                          to={`/clinic/orders/${request.orderId}`}
                          className="inline-flex flex-col gap-1 text-sm font-semibold text-teal-800 hover:text-teal-950"
                        >
                          <span>{request.orderNumber || `Commande ${request.orderId.slice(0, 8)}`}</span>
                          {request.orderStatus ? <OrderStatusBadge status={request.orderStatus} /> : null}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{request.lineCount}</td>
                    <td className="px-4 py-4 text-slate-700">
                      {request.totalRequestedQuantity ?? '-'}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatDateOnly(request.requestedDeliveryDate)}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatDateTime(getLatestQuotationActivityDate(request))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
