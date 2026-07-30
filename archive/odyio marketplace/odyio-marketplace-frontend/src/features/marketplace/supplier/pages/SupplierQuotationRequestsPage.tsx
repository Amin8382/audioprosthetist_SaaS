import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../../../../shared/components/EmptyState'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import { formatDateOnly, formatDateTime } from '../../../../shared/utils/dateFormat'
import OrderStatusBadge from '../../order/components/OrderStatusBadge'
import { getQuotationRequestsBySupplier } from '../../quotation/api/quotationRequestApi'
import QuotationOfferStateBadge from '../../quotation/components/QuotationOfferStateBadge'
import QuotationStatusBadge from '../../quotation/components/QuotationStatusBadge'
import type {
  QuotationRequestSummaryResponse,
  SupplierQuotationWorkflowStatus,
} from '../../quotation/types/quotationRequest'
import {
  getClinicName,
  getLatestQuotationActivityDate,
  getQuotationId,
} from '../../quotation/utils/quotationSummary'
import SupplierOfferStatusBadge from '../../offer/components/SupplierOfferStatusBadge'
import SupplierWorkflowTabs from '../components/SupplierWorkflowTabs'
import { useSelectedSupplier } from '../store/selectedSupplierStore'

function getOfferAction(request: QuotationRequestSummaryResponse) {
  const requestId = getQuotationId(request)

  if (!request.hasOffer || !request.offerStatus) {
    return {
      label: 'Creer une offre',
      to: `/supplier/quotation-requests/${requestId}/offer`,
      primary: true,
    }
  }

  if (request.offerStatus === 'DRAFT') {
    return {
      label: "Continuer l'offre",
      to: `/supplier/quotation-requests/${requestId}/offer`,
      primary: true,
    }
  }

  return {
    label:
      request.offerStatus === 'SUBMITTED'
        ? "Voir l'offre"
        : request.offerStatus === 'ACCEPTED'
          ? 'Offre acceptee'
          : request.offerStatus === 'REJECTED'
            ? 'Offre refusee'
            : request.offerStatus === 'WITHDRAWN'
              ? 'Offre retiree'
              : 'Offre expiree',
    to: request.offerId ? `/supplier/offers/${request.offerId}` : `/supplier/quotation-requests/${requestId}`,
    primary: false,
  }
}

export default function SupplierQuotationRequestsPage() {
  const [workflowStatus, setWorkflowStatus] =
    useState<SupplierQuotationWorkflowStatus>('TO_PROCESS')
  const { selectedSupplierId } = useSelectedSupplier()

  const quotationRequestsQuery = useQuery({
    queryKey: ['supplier-quotation-requests', selectedSupplierId, workflowStatus],
    queryFn: () => getQuotationRequestsBySupplier(selectedSupplierId, { workflowStatus }),
    enabled: Boolean(selectedSupplierId),
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Portail Fournisseur
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Demandes recues</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Traitez les demandes envoyees au fournisseur actif. Les brouillons clinique ne sont pas
          visibles dans ce portail.
        </p>
      </div>

      <SupplierWorkflowTabs value={workflowStatus} onChange={setWorkflowStatus} />

      {!selectedSupplierId ? (
        <EmptyState
          title="Aucun fournisseur actif"
          message="Selectionnez un fournisseur pour afficher ses demandes recues."
        />
      ) : quotationRequestsQuery.isLoading ? (
        <LoadingState label="Chargement des demandes recues..." />
      ) : quotationRequestsQuery.isError ? (
        <ErrorState message="Impossible de charger les demandes recues de ce fournisseur." />
      ) : (quotationRequestsQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="Aucune demande recue"
          message="Aucune demande ne correspond au fournisseur actif et au filtre actuel."
        />
      ) : (
        <div className="grid gap-4">
          {(quotationRequestsQuery.data ?? []).map((request) => {
            const requestId = getQuotationId(request)
            const offerAction = getOfferAction(request)

            return (
              <article key={requestId} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                      Demande {requestId.slice(0, 8)}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      <Link
                        to={`/supplier/quotation-requests/${requestId}`}
                        className="hover:text-teal-800"
                      >
                        {getClinicName(request)}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {request.lineCount} ligne(s), quantite totale:{' '}
                      {request.totalRequestedQuantity ?? '-'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {request.offerStatus ? (
                      <SupplierOfferStatusBadge status={request.offerStatus} />
                    ) : (
                      <QuotationOfferStateBadge request={request} />
                    )}
                    {workflowStatus === 'CANCELLED' ? <QuotationStatusBadge status={request.status} /> : null}
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <dt className="font-medium text-slate-500">Date demande</dt>
                    <dd className="mt-1 text-slate-800">
                      {formatDateTime(request.sentAt ?? request.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Livraison souhaitee</dt>
                    <dd className="mt-1 text-slate-800">
                      {formatDateOnly(request.requestedDeliveryDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Derniere activite</dt>
                    <dd className="mt-1 text-slate-800">
                      {formatDateTime(getLatestQuotationActivityDate(request))}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Etat demande</dt>
                    <dd className="mt-1">
                      <QuotationStatusBadge status={request.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Commande</dt>
                    <dd className="mt-1">
                      {request.hasOrder && request.orderId ? (
                        <Link
                          to={`/supplier/orders/${request.orderId}`}
                          className="inline-flex flex-col gap-1 font-semibold text-teal-800 hover:text-teal-950"
                        >
                          <span>{request.orderNumber || `Commande ${request.orderId.slice(0, 8)}`}</span>
                          {request.orderStatus ? <OrderStatusBadge status={request.orderStatus} /> : null}
                        </Link>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Link
                    to={`/supplier/quotation-requests/${requestId}`}
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Voir la demande
                  </Link>
                  {workflowStatus !== 'CANCELLED' ? (
                    <Link
                      to={offerAction.to}
                      className={[
                        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition',
                        offerAction.primary
                          ? 'bg-teal-700 text-white hover:bg-teal-800'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      <FileText className="h-4 w-4" />
                      {offerAction.label}
                    </Link>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
