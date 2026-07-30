import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import EmptyState from '../../../../shared/components/EmptyState'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import PageHeader from '../../../../shared/components/PageHeader'
import { formatDateTime } from '../../../../shared/utils/dateFormat'
import { useActiveClinic } from '../../clinic/hooks/useActiveClinic'
import { getClinicOrders, orderQueryKeys } from '../api/orderApi'
import OrderStatusBadge from '../components/OrderStatusBadge'
import type { OrderStatus } from '../types/order'
import { formatOrderMoney, getOrderLineCount, getOrderTotalQuantity } from '../utils/orderFormat'

type StatusFilter = 'all' | OrderStatus

export default function ClinicOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { selectedClinicId, selectedClinicName } = useActiveClinic()
  const scopedStatus = statusFilter === 'all' ? undefined : statusFilter

  const ordersQuery = useQuery({
    queryKey: selectedClinicId ? orderQueryKeys.clinicList(selectedClinicId, scopedStatus) : ['orders', 'clinic', 'none'],
    queryFn: () => getClinicOrders(selectedClinicId, scopedStatus),
    enabled: Boolean(selectedClinicId),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portail Clinique"
        title="Commandes"
        description={`Consultez les commandes de la clinique active.${selectedClinicName ? ` Clinique: ${selectedClinicName}.` : ''}`}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block max-w-xs">
          <span className="text-sm font-medium text-slate-700">Filtrer par statut</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="all">Toutes</option>
            <option value="CREATED">À confirmer</option>
            <option value="CONFIRMED">Confirmées</option>
            <option value="CANCELLED">Annulées</option>
          </select>
        </label>
      </section>

      {!selectedClinicId ? (
        <EmptyState title="Clinique active requise" message="Sélectionnez une clinique pour afficher ses commandes." />
      ) : ordersQuery.isLoading ? (
        <LoadingState label="Chargement des commandes..." />
      ) : ordersQuery.isError ? (
        <ErrorState message="Impossible de charger les commandes de cette clinique." />
      ) : (ordersQuery.data ?? []).length === 0 ? (
        <EmptyState title="Aucune commande pour le moment." message="Aucune commande ne correspond au filtre actuel." />
      ) : (
        <div className="grid gap-4">
          {(ordersQuery.data ?? []).map((order) => (
            <Link
              key={order.id}
              to={`/clinic/orders/${order.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                    {order.orderNumber}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">{order.supplier.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Créée le {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <dt className="font-medium text-slate-500">Total</dt>
                  <dd className="mt-1 font-semibold text-slate-950">
                    {formatOrderMoney(order.total, order.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Lignes</dt>
                  <dd className="mt-1 text-slate-800">{getOrderLineCount(order)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Quantité</dt>
                  <dd className="mt-1 text-slate-800">{getOrderTotalQuantity(order)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Décision</dt>
                  <dd className="mt-1 text-slate-800">
                    {formatDateTime(order.confirmedAt ?? order.cancelledAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Demande</dt>
                  <dd className="mt-1 text-slate-800">{order.quotationRequestId.slice(0, 8)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
