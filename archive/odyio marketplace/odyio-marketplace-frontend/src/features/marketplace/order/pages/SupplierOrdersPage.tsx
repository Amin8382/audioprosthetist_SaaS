import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import EmptyState from '../../../../shared/components/EmptyState'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import PageHeader from '../../../../shared/components/PageHeader'
import { formatDateTime } from '../../../../shared/utils/dateFormat'
import { useActiveSupplier } from '../../supplier/hooks/useActiveSupplier'
import { getSupplierOrders, orderQueryKeys } from '../api/orderApi'
import OrderStatusBadge from '../components/OrderStatusBadge'
import type { OrderStatus } from '../types/order'
import { formatOrderMoney, getOrderLineCount, getOrderTotalQuantity } from '../utils/orderFormat'

type StatusFilter = 'all' | OrderStatus

export default function SupplierOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('CREATED')
  const { selectedSupplierId, selectedSupplierName } = useActiveSupplier()
  const scopedStatus = statusFilter === 'all' ? undefined : statusFilter

  const ordersQuery = useQuery({
    queryKey: selectedSupplierId
      ? orderQueryKeys.supplierList(selectedSupplierId, scopedStatus)
      : ['orders', 'supplier', 'none'],
    queryFn: () => getSupplierOrders(selectedSupplierId, scopedStatus),
    enabled: Boolean(selectedSupplierId),
  })

  const emptyTitle =
    statusFilter === 'CREATED' ? 'Aucune commande à confirmer.' : 'Aucune commande reçue pour le moment.'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portail Fournisseur"
        title="Commandes reçues"
        description={`Suivez les commandes du fournisseur actif.${selectedSupplierName ? ` Fournisseur: ${selectedSupplierName}.` : ''}`}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block max-w-xs">
          <span className="text-sm font-medium text-slate-700">Filtrer par statut</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="CREATED">À confirmer</option>
            <option value="CONFIRMED">Confirmées</option>
            <option value="CANCELLED">Annulées</option>
            <option value="all">Toutes</option>
          </select>
        </label>
      </section>

      {!selectedSupplierId ? (
        <EmptyState title="Fournisseur actif requis" message="Sélectionnez un fournisseur pour afficher ses commandes." />
      ) : ordersQuery.isLoading ? (
        <LoadingState label="Chargement des commandes..." />
      ) : ordersQuery.isError ? (
        <ErrorState message="Impossible de charger les commandes de ce fournisseur." />
      ) : (ordersQuery.data ?? []).length === 0 ? (
        <EmptyState title={emptyTitle} message="Aucune commande ne correspond au filtre actuel." />
      ) : (
        <div className="grid gap-4">
          {(ordersQuery.data ?? []).map((order) => (
            <article key={order.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                    {order.orderNumber}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">{order.clinic.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Créée le {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
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
                  <dt className="font-medium text-slate-500">Action</dt>
                  <dd className="mt-1">
                    {order.status === 'CREATED'
                      ? 'Examiner et confirmer'
                      : order.status === 'CONFIRMED'
                        ? 'Voir la commande'
                        : 'Commande annulée'}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex justify-end">
                <Link
                  to={`/supplier/orders/${order.id}`}
                  className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  {order.status === 'CREATED' ? 'Examiner et confirmer' : 'Voir la commande'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
