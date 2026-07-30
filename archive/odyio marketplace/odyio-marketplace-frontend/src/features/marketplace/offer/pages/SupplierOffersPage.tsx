import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import EmptyState from '../../../../shared/components/EmptyState'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import { formatDateOnly, formatDateTime } from '../../../../shared/utils/dateFormat'
import OrderStatusBadge from '../../order/components/OrderStatusBadge'
import { useSelectedSupplier } from '../../supplier/store/selectedSupplierStore'
import { getSupplierOffers } from '../api/offerApi'
import SupplierOfferStatusBadge from '../components/SupplierOfferStatusBadge'
import { formatAmount } from '../utils/offerFormat'
import type { SupplierOfferStatus } from '../types/supplierOffer'

type OfferStatusFilter = 'all' | SupplierOfferStatus

export default function SupplierOffersPage() {
  const [statusFilter, setStatusFilter] = useState<OfferStatusFilter>('all')
  const { selectedSupplierId } = useSelectedSupplier()
  const scopedStatus = statusFilter === 'all' ? undefined : statusFilter

  const offersQuery = useQuery({
    queryKey: ['offers', selectedSupplierId, scopedStatus],
    queryFn: () => getSupplierOffers(selectedSupplierId, scopedStatus),
    enabled: Boolean(selectedSupplierId),
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Portail Fournisseur
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Offres commerciales</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Consultez les offres creees pour le fournisseur actif.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block max-w-xs">
          <span className="text-sm font-medium text-slate-700">Filtrer par statut</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as OfferStatusFilter)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="all">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SUBMITTED">Soumise</option>
            <option value="ACCEPTED">Acceptée</option>
            <option value="REJECTED">Refusée</option>
            <option value="WITHDRAWN">Retiree</option>
            <option value="EXPIRED">Expiree</option>
          </select>
        </label>
      </section>

      {!selectedSupplierId ? (
        <EmptyState
          title="Aucun fournisseur actif"
          message="Selectionnez un fournisseur pour afficher ses offres."
        />
      ) : offersQuery.isLoading ? (
        <LoadingState label="Chargement des offres..." />
      ) : offersQuery.isError ? (
        <ErrorState message="Impossible de charger les offres du fournisseur." />
      ) : (offersQuery.data ?? []).length === 0 ? (
        <EmptyState title="Aucune offre" message="Aucune offre ne correspond au filtre actuel." />
      ) : (
        <div className="grid gap-4">
          {(offersQuery.data ?? []).map((offer) => (
            <Link
              key={offer.id}
              to={`/supplier/offers/${offer.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-teal-700">
                    Demande {offer.quotationRequestId.slice(0, 8)}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {offer.clinicName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Creee le {formatDateTime(offer.createdAt)}
                  </p>
                </div>
                <SupplierOfferStatusBadge status={offer.status} />
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Montant total
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-950">{formatAmount(offer.totalAmount)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Delai
                  </dt>
                  <dd className="mt-1 text-slate-800">{offer.deliveryDelayDays} jour(s)</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Validite
                  </dt>
                  <dd className="mt-1 text-slate-800">{formatDateOnly(offer.validUntil)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Soumise le
                  </dt>
                  <dd className="mt-1 text-slate-800">{formatDateTime(offer.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Décision
                  </dt>
                  <dd className="mt-1 text-slate-800">{formatDateTime(offer.decisionAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Commande
                  </dt>
                  <dd className="mt-1">
                    {offer.hasOrder ? (
                      <span className="inline-flex flex-col gap-1">
                        <span className="font-semibold text-slate-950">
                          {offer.orderNumber || 'Creee'}
                        </span>
                        {offer.orderStatus ? <OrderStatusBadge status={offer.orderStatus} /> : null}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
