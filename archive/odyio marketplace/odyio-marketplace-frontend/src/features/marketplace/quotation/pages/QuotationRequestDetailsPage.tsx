import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, CheckCircle2, ClipboardList, Send, XCircle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ActorRequiredState from '../../../../shared/components/ActorRequiredState'
import Breadcrumbs from '../../../../shared/components/Breadcrumbs'
import ErrorState from '../../../../shared/components/ErrorState'
import EmptyState from '../../../../shared/components/EmptyState'
import LoadingState from '../../../../shared/components/LoadingState'
import SectionCard from '../../../../shared/components/SectionCard'
import SuccessMessage from '../../../../shared/components/SuccessMessage'
import { getApiErrorMessage, isNotFoundError } from '../../../../shared/api/httpClient'
import { formatDateOnly, formatDateTime } from '../../../../shared/utils/dateFormat'
import { useConfirmDialog } from '../../../../shared/hooks/useConfirmDialog'
import { useActiveClinic } from '../../clinic/hooks/useActiveClinic'
import { createOrderFromOffer } from '../../order/api/orderApi'
import OrderStatusBadge from '../../order/components/OrderStatusBadge'
import { acceptOffer, getOfferByQuotationRequest, rejectOffer } from '../../offer/api/offerApi'
import { notificationQueryKeys } from '../../notification/api/notificationApi'
import RejectOfferDialog from '../../offer/components/RejectOfferDialog'
import SupplierOfferDecisionPanel from '../../offer/components/SupplierOfferDecisionPanel'
import SupplierOfferStatusBadge from '../../offer/components/SupplierOfferStatusBadge'
import { formatAmount } from '../../offer/utils/offerFormat'
import type { SupplierOffer } from '../../offer/types/supplierOffer'
import {
  cancelQuotationRequest,
  getQuotationRequestById,
  sendQuotationRequest,
} from '../api/quotationRequestApi'
import QuotationStatusBadge from '../components/QuotationStatusBadge'

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value || '-'}</dd>
    </div>
  )
}

function getOfferLifecycleSteps(offer?: SupplierOffer, offerNotFound = false) {
  const steps = ['Demande envoyée']

  if (offerNotFound || !offer) {
    return [...steps, 'En attente d’offre']
  }

  if (offer.status === 'DRAFT') {
    return [...steps, 'Offre en préparation']
  }

  if (offer.status === 'SUBMITTED') {
    return [...steps, 'Offre soumise', 'Décision clinique attendue']
  }

  if (offer.status === 'ACCEPTED') {
    return [...steps, 'Offre soumise', 'Acceptée', 'Commande — étape suivante']
  }

  if (offer.status === 'REJECTED') {
    return [...steps, 'Offre soumise', 'Refusée']
  }

  if (offer.status === 'WITHDRAWN') {
    return [...steps, 'Offre retirée']
  }

  return [...steps, 'Offre expirée']
}

export default function QuotationRequestDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirmDialog()
  const { selectedClinicId } = useActiveClinic()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

  const quotationRequestQuery = useQuery({
    queryKey: ['quotation-requests', id],
    queryFn: () => getQuotationRequestById(id as string),
    enabled: Boolean(id),
  })

  const offerQuery = useQuery({
    queryKey: ['offer-by-quotation', id],
    queryFn: () => getOfferByQuotationRequest(id as string),
    enabled: Boolean(id),
    retry: false,
  })

  const invalidateQuotationQueries = async (requestId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['quotation-requests', requestId] }),
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
    ])
  }

  const refreshOfferQueries = async (updatedOffer: SupplierOffer) => {
    queryClient.setQueryData(['offer', updatedOffer.id], updatedOffer)
    queryClient.setQueryData(['offer-by-quotation', updatedOffer.quotationRequestId], updatedOffer)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['offer', updatedOffer.id] }),
      queryClient.invalidateQueries({ queryKey: ['offer-by-quotation', updatedOffer.quotationRequestId] }),
      queryClient.invalidateQueries({ queryKey: ['offers'] }),
      queryClient.invalidateQueries({ queryKey: ['offers', updatedOffer.supplierId] }),
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'supplier', updatedOffer.supplierId],
      }),
      queryClient.invalidateQueries({ queryKey: ['notifications', 'clinic', updatedOffer.clinicId] }),
    ])
  }

  const invalidateOrderCreationQueries = async (createdOrderClinicId: string, orderId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['order', 'clinic', createdOrderClinicId, orderId] }),
      queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] }),
      id ? queryClient.invalidateQueries({ queryKey: ['quotation-requests', id] }) : Promise.resolve(),
      id ? queryClient.invalidateQueries({ queryKey: ['offer-by-quotation', id] }) : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ['offers'] }),
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
    ])
  }

  const sendMutation = useMutation({
    mutationFn: sendQuotationRequest,
    onSuccess: async (response) => {
      await invalidateQuotationQueries(response.id)
      setSuccessMessage('La demande de devis a ete envoyee.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelQuotationRequest,
    onSuccess: async (response) => {
      await invalidateQuotationQueries(response.id)
      setSuccessMessage('La demande de devis a ete annulee.')
    },
  })

  const acceptMutation = useMutation({
    mutationFn: ({ offerId, clinicId }: { offerId: string; clinicId: string }) =>
      acceptOffer(offerId, clinicId),
    onSuccess: async (updatedOffer) => {
      await refreshOfferQueries(updatedOffer)
      setSuccessMessage("L’offre a été acceptée.")
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({
      offerId,
      clinicId,
      reason,
    }: {
      offerId: string
      clinicId: string
      reason?: string
    }) => rejectOffer(offerId, clinicId, reason),
    onSuccess: async (updatedOffer) => {
      await refreshOfferQueries(updatedOffer)
      setIsRejectDialogOpen(false)
      setSuccessMessage("L’offre a été refusée.")
    },
  })

  const createOrderMutation = useMutation({
    mutationFn: ({ offerId, clinicId }: { offerId: string; clinicId: string }) =>
      createOrderFromOffer(offerId, clinicId),
    onSuccess: async (createdOrder) => {
      await invalidateOrderCreationQueries(createdOrder.clinic.id, createdOrder.id)
      setSuccessMessage('Commande creee avec succes.')
      navigate(`/clinic/orders/${createdOrder.id}`)
    },
    onError: async () => {
      if (id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['quotation-requests', id] }),
          queryClient.invalidateQueries({ queryKey: ['offer-by-quotation', id] }),
        ])
      }
    },
  })

  const handleCancel = async () => {
    if (!id) {
      return
    }

    const confirmed = await confirm({
      title: 'Annuler la demande',
      message: 'La demande passera au statut annule et restera consultable.',
      confirmLabel: 'Annuler la demande',
      destructive: true,
    })

    if (confirmed) {
      cancelMutation.mutate(id)
    }
  }

  const handleAcceptOffer = async (offerId: string) => {
    if (!selectedClinicId) {
      return
    }

    const confirmed = await confirm({
      title: 'Accepter cette offre ?',
      message:
        "Vous confirmez l’acceptation définitive de cette offre aux conditions affichées. Cette décision ne pourra pas être modifiée.",
      confirmLabel: "Accepter l’offre",
    })

    if (confirmed) {
      acceptMutation.mutate({ offerId, clinicId: selectedClinicId })
    }
  }

  const handleRejectOffer = (reason?: string) => {
    if (!offer?.id || !selectedClinicId) {
      return
    }

    rejectMutation.mutate({ offerId: offer.id, clinicId: selectedClinicId, reason })
  }

  const handleCreateOrder = async (currentOffer: SupplierOffer) => {
    if (!selectedClinicId) {
      return
    }

    const confirmed = await confirm({
      title: 'Creer la commande ?',
      message:
        "La commande reprendra definitivement les produits, quantites, prix et conditions de l'offre acceptee. Les valeurs de la commande ne suivront pas les futures modifications du catalogue.",
      confirmLabel: 'Creer la commande',
    })

    if (confirmed) {
      createOrderMutation.mutate({ offerId: currentOffer.id, clinicId: selectedClinicId })
    }
  }

  if (!id) {
    return <ErrorState message="Identifiant de demande manquant." />
  }

  if (quotationRequestQuery.isLoading) {
    return <LoadingState label="Chargement de la demande..." />
  }

  if (quotationRequestQuery.isError || !quotationRequestQuery.data) {
    return <ErrorState message="Impossible de charger la demande de devis." />
  }

  const request = quotationRequestQuery.data
  const offer = offerQuery.data
  const offerNotFound = offerQuery.isError && isNotFoundError(offerQuery.error)
  const mutationError =
    sendMutation.error ?? cancelMutation.error ?? acceptMutation.error ?? createOrderMutation.error
  const canSend = request.status === 'DRAFT'
  const canCancel = request.status === 'DRAFT' || request.status === 'SENT'
  const selectedClinicOwnsRequest = selectedClinicId === request.clinicId
  const canDecideOffer = offer?.status === 'SUBMITTED' && selectedClinicOwnsRequest
  const canCreateOrder =
    offer?.status === 'ACCEPTED' && selectedClinicOwnsRequest && !offer.hasOrder
  const canViewOrder =
    offer?.status === 'ACCEPTED' && selectedClinicOwnsRequest && Boolean(offer.orderId)
  const isDecisionPending = acceptMutation.isPending || rejectMutation.isPending
  const lifecycleSteps = getOfferLifecycleSteps(offer, offerNotFound)

  return (
    <div className="space-y-6">
      {dialog}
      <RejectOfferDialog
        open={isRejectDialogOpen}
        isPending={rejectMutation.isPending}
        errorMessage={rejectMutation.error ? getApiErrorMessage(rejectMutation.error) : null}
        onCancel={() => setIsRejectDialogOpen(false)}
        onReject={handleRejectOffer}
      />
      <Breadcrumbs
        items={[
          { label: 'Demandes de devis', to: '/clinic/quotation-requests' },
          { label: request.clinicName },
        ]}
      />

      <Link
        to="/clinic/quotation-requests"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux demandes
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Demande de devis
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{request.clinicName}</h1>
            <p className="mt-2 text-slate-600">Fournisseur: {request.supplierName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <QuotationStatusBadge status={request.status} />
            {canSend ? (
              <button
                type="button"
                onClick={() => sendMutation.mutate(request.id)}
                disabled={sendMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
              >
                <Send className="h-4 w-4" />
                {sendMutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
              </button>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:text-slate-400"
              >
                <Ban className="h-4 w-4" />
                {cancelMutation.isPending ? 'Annulation...' : 'Annuler la demande'}
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
          <DetailItem label="Date livraison souhaitee" value={formatDateOnly(request.requestedDeliveryDate)} />
          <DetailItem label="Envoyee le" value={formatDateTime(request.sentAt)} />
          <DetailItem label="Expiration" value={formatDateTime(request.expiresAt)} />
          <DetailItem label="Creee le" value={formatDateTime(request.createdAt)} />
        </dl>
      </section>

      <SectionCard title="Cycle de vie">
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {lifecycleSteps.map((step, index) => (
            <div key={step} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-800">{step}</p>
              <p className="mt-1 text-xs text-slate-500">
                {step.includes('Commande')
                  ? 'Étape suivante, non interactive dans ce sprint.'
                  : index === 0
                    ? 'Statut de la demande.'
                    : 'État de l’offre fournisseur.'}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Notes clinique</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
          {request.clinicNotes || 'Aucune note renseignee.'}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-950">Produits demandes</h2>
        {request.lines.map((line) => (
          <div key={line.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-950">{line.productName}</h3>
                <p className="mt-1 text-sm text-slate-500">Reference: {line.productReference || '-'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                Quantite: {line.quantity}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
              {line.lineNotes || 'Aucune note ligne.'}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Offre fournisseur
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Proposition commerciale</h2>
        </div>

        {offerQuery.isLoading ? (
          <div className="p-5">
            <LoadingState label="Chargement de l'offre..." />
          </div>
        ) : offerNotFound ? (
          <div className="p-5">
            <EmptyState
              title="Aucune offre reçue pour le moment."
              message="Le fournisseur n'a pas encore soumis d'offre pour cette demande."
            />
          </div>
        ) : offerQuery.isError ? (
          <div className="p-5">
            <ErrorState message="Impossible de charger l'offre fournisseur." />
          </div>
        ) : offer ? (
          <>
            <div className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{offer.supplierName}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {offer.supplierNotes || 'Aucune note fournisseur.'}
                  </p>
                </div>
                <SupplierOfferStatusBadge status={offer.status} />
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    Total
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-950">{formatAmount(offer.totalAmount)}</dd>
                </div>
              </dl>

              <div className="mt-5 space-y-4">
                <SupplierOfferDecisionPanel offer={offer} />

                {offer.status === 'ACCEPTED' ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-950">Commande</h3>
                        {offer.hasOrder && offer.orderId ? (
                          <p className="mt-1 text-sm text-slate-600">
                            Une commande existe deja pour cette offre acceptee.
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-slate-600">
                            La commande peut etre creee depuis cette offre acceptee. Les valeurs
                            seront figees a partir de l'offre.
                          </p>
                        )}
                        {offer.orderNumber || offer.orderStatus ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                            {offer.orderNumber ? (
                              <span className="font-semibold text-slate-800">
                                {offer.orderNumber}
                              </span>
                            ) : null}
                            {offer.orderStatus ? <OrderStatusBadge status={offer.orderStatus} /> : null}
                          </div>
                        ) : null}
                      </div>

                      {canViewOrder && offer.orderId ? (
                        <Link
                          to={`/clinic/orders/${offer.orderId}`}
                          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <ClipboardList className="h-4 w-4" />
                          Voir la commande
                        </Link>
                      ) : canCreateOrder ? (
                        <button
                          type="button"
                          onClick={() => void handleCreateOrder(offer)}
                          disabled={createOrderMutation.isPending}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
                        >
                          <ClipboardList className="h-4 w-4" />
                          {createOrderMutation.isPending ? 'Creation...' : 'Creer la commande'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {!selectedClinicId ? (
                  <ActorRequiredState
                    title="Clinique active requise"
                    message="Sélectionnez la clinique active pour décider de cette offre."
                  />
                ) : selectedClinicId !== request.clinicId ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    Cette demande appartient à une autre clinique. Les actions de décision sont
                    masquées.
                  </div>
                ) : null}

                {canDecideOffer ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-950">Décision clinique</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      L’offre est à prix fixe. Vous pouvez uniquement accepter ou refuser les
                      conditions affichées.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void handleAcceptOffer(offer.id)}
                        disabled={isDecisionPending}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {acceptMutation.isPending ? "Acceptation..." : "Accepter l’offre"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRejectDialogOpen(true)}
                        disabled={isDecisionPending}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:text-slate-400"
                      >
                        <XCircle className="h-4 w-4" />
                        {rejectMutation.isPending ? "Refus..." : "Refuser l’offre"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="overflow-x-auto border-t border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Produit</th>
                    <th className="px-4 py-3">Quantite</th>
                    <th className="px-4 py-3">Prix unitaire</th>
                    <th className="px-4 py-3">Sous-total</th>
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
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}
