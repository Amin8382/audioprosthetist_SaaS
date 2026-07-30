import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ClipboardList, Edit, Send, Undo2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Breadcrumbs from '../../../../shared/components/Breadcrumbs'
import EmptyState from '../../../../shared/components/EmptyState'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import SuccessMessage from '../../../../shared/components/SuccessMessage'
import { getApiErrorMessage } from '../../../../shared/api/httpClient'
import { formatDateOnly, formatDateTime } from '../../../../shared/utils/dateFormat'
import { useConfirmDialog } from '../../../../shared/hooks/useConfirmDialog'
import { notificationQueryKeys } from '../../notification/api/notificationApi'
import OrderStatusBadge from '../../order/components/OrderStatusBadge'
import { getOffer, submitOffer, withdrawOffer } from '../api/offerApi'
import SupplierOfferDecisionPanel from '../components/SupplierOfferDecisionPanel'
import SupplierOfferStatusBadge from '../components/SupplierOfferStatusBadge'
import { formatAmount } from '../utils/offerFormat'

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value || '-'}</dd>
    </div>
  )
}

export default function SupplierOfferDetailsPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirmDialog()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const offerQuery = useQuery({
    queryKey: ['offer', id],
    queryFn: () => getOffer(id as string),
    enabled: Boolean(id),
  })

  const invalidateOffers = async (offerId: string, quotationRequestId?: string, supplierId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['offer', offerId] }),
      queryClient.invalidateQueries({ queryKey: ['offers'] }),
      queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] }),
      supplierId
        ? queryClient.invalidateQueries({ queryKey: ['offers', supplierId] })
        : Promise.resolve(),
      quotationRequestId
        ? queryClient.invalidateQueries({ queryKey: ['offer-by-quotation', quotationRequestId] })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
    ])
  }

  const submitMutation = useMutation({
    mutationFn: submitOffer,
    onSuccess: async (offer) => {
      await invalidateOffers(offer.id, offer.quotationRequestId, offer.supplierId)
      setSuccessMessage('L offre a ete soumise.')
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: withdrawOffer,
    onSuccess: async (offer) => {
      await invalidateOffers(offer.id, offer.quotationRequestId, offer.supplierId)
      setSuccessMessage('L offre a ete retiree.')
    },
  })

  const handleWithdraw = async (offerId: string) => {
    const confirmed = await confirm({
      title: 'Retirer l offre',
      message: 'Cette offre soumise passera en lecture seule avec le statut retire.',
      confirmLabel: 'Retirer l offre',
      destructive: true,
    })

    if (confirmed) {
      withdrawMutation.mutate(offerId)
    }
  }

  if (!id) {
    return <ErrorState message="Identifiant d'offre manquant." />
  }

  if (offerQuery.isLoading) {
    return <LoadingState label="Chargement de l'offre..." />
  }

  if (offerQuery.isError || !offerQuery.data) {
    return <ErrorState message="Impossible de charger l'offre fournisseur." />
  }

  const offer = offerQuery.data
  const mutationError = submitMutation.error ?? withdrawMutation.error
  const canEdit = offer.status === 'DRAFT'
  const canSubmit = offer.status === 'DRAFT'
  const canWithdraw = offer.status === 'SUBMITTED'

  return (
    <div className="space-y-6">
      {dialog}
      <Breadcrumbs
        items={[
          { label: 'Offres', to: '/supplier/offers' },
          { label: offer.clinicName },
        ]}
      />

      <Link
        to="/supplier/offers"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux offres
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Offre fournisseur
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {offer.clinicName}
            </h1>
            <p className="mt-2 text-slate-600">
              Demande {offer.quotationRequestId.slice(0, 8)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SupplierOfferStatusBadge status={offer.status} />
            {canEdit ? (
              <Link
                to={`/supplier/quotation-requests/${offer.quotationRequestId}/offer`}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <Edit className="h-4 w-4" />
                Modifier
              </Link>
            ) : null}
            {canSubmit ? (
              <button
                type="button"
                onClick={() => submitMutation.mutate(offer.id)}
                disabled={submitMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
              >
                <Send className="h-4 w-4" />
                {submitMutation.isPending ? 'Soumission...' : 'Soumettre'}
              </button>
            ) : null}
            {canWithdraw ? (
              <button
                type="button"
                onClick={() => void handleWithdraw(offer.id)}
                disabled={withdrawMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:text-slate-400"
              >
                <Undo2 className="h-4 w-4" />
                {withdrawMutation.isPending ? 'Retrait...' : 'Retirer'}
              </button>
            ) : null}
          </div>
        </div>

        {mutationError ? (
          <div className="mt-6">
            <ErrorState title="Action impossible" message={getApiErrorMessage(mutationError)} />
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6">
            <SuccessMessage message={successMessage} />
          </div>
        ) : null}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Fournisseur" value={offer.supplierName} />
          <InfoItem label="Delai" value={`${offer.deliveryDelayDays} jour(s)`} />
          <InfoItem label="Validite" value={formatDateOnly(offer.validUntil)} />
          <InfoItem label="Soumise le" value={formatDateTime(offer.submittedAt)} />
          <InfoItem label="Decision le" value={formatDateTime(offer.decisionAt)} />
        </dl>
      </section>

      <SupplierOfferDecisionPanel offer={offer} audience="supplier" />

      {offer.status === 'ACCEPTED' ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Commande</h2>
              {offer.hasOrder && offer.orderId ? (
                <p className="mt-2 text-sm text-slate-600">
                  Une commande a ete creee par la clinique pour cette offre acceptee.
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  En attente de creation de la commande par la clinique.
                </p>
              )}
              {offer.orderNumber || offer.orderStatus ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  {offer.orderNumber ? (
                    <span className="font-semibold text-slate-800">{offer.orderNumber}</span>
                  ) : null}
                  {offer.orderStatus ? <OrderStatusBadge status={offer.orderStatus} /> : null}
                </div>
              ) : null}
            </div>
            {offer.hasOrder && offer.orderId ? (
              <Link
                to={`/supplier/orders/${offer.orderId}`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ClipboardList className="h-4 w-4" />
                Voir la commande
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Notes fournisseur</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
          {offer.supplierNotes || 'Aucune note fournisseur.'}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-semibold text-slate-950">Proposition commerciale</h2>
        </div>
        {offer.lines.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Aucune ligne" message="Cette offre ne contient aucune ligne." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Quantite</th>
                  <th className="px-4 py-3">Prix unitaire</th>
                  <th className="px-4 py-3">Sous-total</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {offer.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{line.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">{line.productReference || '-'}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{line.quantity}</td>
                    <td className="px-4 py-4 text-slate-700">{formatAmount(line.unitPrice)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950">
                      {formatAmount(line.lineSubtotal)}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{line.lineNotes || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td className="px-4 py-4 text-right font-semibold text-slate-950" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-4 text-lg font-semibold text-slate-950">
                    {formatAmount(offer.totalAmount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
