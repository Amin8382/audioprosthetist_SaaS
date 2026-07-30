import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Breadcrumbs from '../../../../shared/components/Breadcrumbs'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import SuccessMessage from '../../../../shared/components/SuccessMessage'
import { getApiErrorMessage } from '../../../../shared/api/httpClient'
import { useConfirmDialog } from '../../../../shared/hooks/useConfirmDialog'
import { formatDateTime } from '../../../../shared/utils/dateFormat'
import { notificationQueryKeys } from '../../notification/api/notificationApi'
import { useActiveSupplier } from '../../supplier/hooks/useActiveSupplier'
import { confirmOrder, getSupplierOrder, orderQueryKeys } from '../api/orderApi'
import OrderSnapshotSections from '../components/OrderSnapshotSections'
import OrderStatusBadge from '../components/OrderStatusBadge'

export default function SupplierOrderDetailsPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirmDialog()
  const { selectedSupplierId } = useActiveSupplier()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const orderQuery = useQuery({
    queryKey:
      selectedSupplierId && id
        ? orderQueryKeys.supplierDetail(selectedSupplierId, id)
        : ['order', 'supplier', 'none', id],
    queryFn: () => getSupplierOrder(selectedSupplierId, id as string),
    enabled: Boolean(selectedSupplierId && id),
  })

  const confirmMutation = useMutation({
    mutationFn: ({ orderId, supplierId }: { orderId: string; supplierId: string }) =>
      confirmOrder(orderId, supplierId),
    onSuccess: async (order) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['order'] }),
        queryClient.invalidateQueries({ queryKey: ['offers'] }),
        queryClient.invalidateQueries({ queryKey: ['offer'] }),
        queryClient.invalidateQueries({ queryKey: ['offer-by-quotation'] }),
        queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
      ])
      queryClient.setQueryData(orderQueryKeys.supplierDetail(order.supplier.id, order.id), order)
      setSuccessMessage('Commande confirmée.')
    },
  })

  const handleConfirmOrder = async () => {
    if (!id || !selectedSupplierId) {
      return
    }

    const confirmed = await confirm({
      title: 'Confirmer cette commande ?',
      message:
        'Vous confirmez la prise en compte de cette commande aux conditions affichées. Cette action ne signifie pas que la commande est payée, expédiée ou livrée.',
      confirmLabel: 'Confirmer la commande',
    })

    if (confirmed) {
      confirmMutation.mutate({ orderId: id, supplierId: selectedSupplierId })
    }
  }

  if (!id) {
    return <ErrorState message="Identifiant commande manquant." />
  }

  if (!selectedSupplierId) {
    return <ErrorState title="Fournisseur actif requis" message="Sélectionnez un fournisseur pour consulter cette commande." />
  }

  if (orderQuery.isLoading) {
    return <LoadingState label="Chargement de la commande..." />
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorState title="Commande inaccessible" message={getApiErrorMessage(orderQuery.error)} />
  }

  const order = orderQuery.data

  if (order.supplier.id !== selectedSupplierId) {
    return (
      <ErrorState
        title="Commande hors fournisseur actif"
        message="Cette commande appartient à un autre fournisseur."
      />
    )
  }

  return (
    <div className="space-y-6">
      {dialog}
      <Breadcrumbs
        items={[
          { label: 'Commandes reçues', to: '/supplier/orders' },
          { label: order.orderNumber },
        ]}
      />

      <Link
        to="/supplier/orders"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux commandes
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Commande reçue
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{order.orderNumber}</h1>
            <p className="mt-2 text-slate-600">Clinique: {order.clinic.name}</p>
            <p className="mt-1 text-sm text-slate-500">Créée le {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            {order.status === 'CREATED' ? (
              <button
                type="button"
                onClick={() => void handleConfirmOrder()}
                disabled={confirmMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
              >
                <CheckCircle2 className="h-4 w-4" />
                {confirmMutation.isPending ? 'Confirmation...' : 'Confirmer la commande'}
              </button>
            ) : null}
          </div>
        </div>

        {confirmMutation.isError ? (
          <div className="mt-6">
            <ErrorState title="Confirmation impossible" message={getApiErrorMessage(confirmMutation.error)} />
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6">
            <SuccessMessage message={successMessage} />
          </div>
        ) : null}

        {order.status === 'CONFIRMED' ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Commande confirmée le {formatDateTime(order.confirmedAt)}. Cela ne signifie pas que la
            commande est payée, expédiée ou livrée.
          </div>
        ) : null}

        {order.status === 'CANCELLED' ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p>Commande annulée le {formatDateTime(order.cancelledAt)}.</p>
            <p className="mt-2 whitespace-pre-line">
              {order.cancellationReason?.trim() || 'Aucun motif communiqué.'}
            </p>
          </div>
        ) : null}
      </section>

      <OrderSnapshotSections order={order} />
    </div>
  )
}
