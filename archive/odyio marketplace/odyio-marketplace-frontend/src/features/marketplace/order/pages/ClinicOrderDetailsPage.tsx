import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Breadcrumbs from '../../../../shared/components/Breadcrumbs'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import SuccessMessage from '../../../../shared/components/SuccessMessage'
import { getApiErrorMessage } from '../../../../shared/api/httpClient'
import { formatDateTime } from '../../../../shared/utils/dateFormat'
import { useActiveClinic } from '../../clinic/hooks/useActiveClinic'
import { notificationQueryKeys } from '../../notification/api/notificationApi'
import {
  cancelOrder,
  getClinicOrder,
  orderQueryKeys,
} from '../api/orderApi'
import CancelOrderDialog from '../components/CancelOrderDialog'
import OrderSnapshotSections from '../components/OrderSnapshotSections'
import OrderStatusBadge from '../components/OrderStatusBadge'

export default function ClinicOrderDetailsPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { selectedClinicId } = useActiveClinic()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

  const orderQuery = useQuery({
    queryKey: selectedClinicId && id ? orderQueryKeys.clinicDetail(selectedClinicId, id) : ['order', 'clinic', 'none', id],
    queryFn: () => getClinicOrder(selectedClinicId, id as string),
    enabled: Boolean(selectedClinicId && id),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, clinicId, reason }: { orderId: string; clinicId: string; reason?: string }) =>
      cancelOrder(orderId, clinicId, reason),
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
      queryClient.setQueryData(orderQueryKeys.clinicDetail(order.clinic.id, order.id), order)
      setIsCancelDialogOpen(false)
      setSuccessMessage('Commande annulée.')
    },
  })

  const handleCancelOrder = (reason?: string) => {
    if (!id || !selectedClinicId) {
      return
    }

    cancelMutation.mutate({ orderId: id, clinicId: selectedClinicId, reason })
  }

  if (!id) {
    return <ErrorState message="Identifiant commande manquant." />
  }

  if (!selectedClinicId) {
    return <ErrorState title="Clinique active requise" message="Sélectionnez une clinique pour consulter cette commande." />
  }

  if (orderQuery.isLoading) {
    return <LoadingState label="Chargement de la commande..." />
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorState title="Commande inaccessible" message={getApiErrorMessage(orderQuery.error)} />
  }

  const order = orderQuery.data

  if (order.clinic.id !== selectedClinicId) {
    return (
      <ErrorState
        title="Commande hors clinique active"
        message="Cette commande appartient à une autre clinique."
      />
    )
  }

  return (
    <div className="space-y-6">
      <CancelOrderDialog
        open={isCancelDialogOpen}
        isPending={cancelMutation.isPending}
        errorMessage={cancelMutation.error ? getApiErrorMessage(cancelMutation.error) : null}
        onCancel={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancelOrder}
      />
      <Breadcrumbs
        items={[
          { label: 'Commandes', to: '/clinic/orders' },
          { label: order.orderNumber },
        ]}
      />

      <Link
        to="/clinic/orders"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux commandes
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Commande</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{order.orderNumber}</h1>
            <p className="mt-2 text-slate-600">Fournisseur: {order.supplier.name}</p>
            <p className="mt-1 text-sm text-slate-500">Créée le {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            {order.status === 'CREATED' ? (
              <button
                type="button"
                onClick={() => setIsCancelDialogOpen(true)}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:text-slate-400"
              >
                <Ban className="h-4 w-4" />
                Annuler la commande
              </button>
            ) : null}
          </div>
        </div>

        {successMessage ? (
          <div className="mt-6">
            <SuccessMessage message={successMessage} />
          </div>
        ) : null}

        {order.status === 'CONFIRMED' ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Commande confirmée le {formatDateTime(order.confirmedAt)}. Cet état est terminal dans ce sprint.
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
