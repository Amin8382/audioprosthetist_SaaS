import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ClipboardList, FileText, MessageSquare } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import { isNotFoundError } from '../../../../shared/api/httpClient'
import { formatDateOnly, formatDateTime } from '../../../../shared/utils/dateFormat'
import { getOfferByQuotationRequest } from '../../offer/api/offerApi'
import OrderStatusBadge from '../../order/components/OrderStatusBadge'
import SupplierOfferStatusBadge from '../../offer/components/SupplierOfferStatusBadge'
import { getSupplierScopedQuotationRequest } from '../../quotation/api/quotationRequestApi'
import QuotationStatusBadge from '../../quotation/components/QuotationStatusBadge'
import { useSelectedSupplier } from '../store/selectedSupplierStore'

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value || '-'}</dd>
    </div>
  )
}

export default function SupplierQuotationRequestDetailsPage() {
  const { id } = useParams()
  const { selectedSupplierId } = useSelectedSupplier()

  const quotationRequestQuery = useQuery({
    queryKey: ['supplier-quotation-requests', selectedSupplierId, id],
    queryFn: () => getSupplierScopedQuotationRequest(selectedSupplierId, id as string),
    enabled: Boolean(id && selectedSupplierId),
  })

  const offerQuery = useQuery({
    queryKey: ['offer-by-quotation', id],
    queryFn: () => getOfferByQuotationRequest(id as string),
    enabled: Boolean(id),
    retry: false,
  })

  if (!id) {
    return <ErrorState message="Identifiant de demande manquant." />
  }

  if (!selectedSupplierId) {
    return (
      <ErrorState
        title="Fournisseur requis"
        message="Selectionnez un fournisseur actif avant de consulter cette demande."
      />
    )
  }

  if (quotationRequestQuery.isLoading) {
    return <LoadingState label="Chargement de la demande recue..." />
  }

  if (quotationRequestQuery.isError || !quotationRequestQuery.data) {
    return (
      <ErrorState message="Impossible de charger cette demande fournisseur. Elle peut appartenir a un autre fournisseur ou ne pas etre visible." />
    )
  }

  const request = quotationRequestQuery.data
  const offer = offerQuery.data
  const offerNotFound = offerQuery.isError && isNotFoundError(offerQuery.error)

  if (request.status === 'DRAFT') {
    return (
      <ErrorState
        title="Demande non visible"
        message="Les brouillons de clinique ne sont pas visibles dans le portail fournisseur."
      />
    )
  }

  if (offerQuery.isError && !offerNotFound) {
    return <ErrorState message="Impossible de verifier l'offre liee a cette demande." />
  }

  if (offer && offer.supplierId !== selectedSupplierId) {
    return (
      <ErrorState
        title="Offre hors fournisseur actif"
        message="L'offre liee a cette demande appartient a un autre fournisseur."
      />
    )
  }

  if (request.supplierId !== selectedSupplierId) {
    return (
      <ErrorState
        title="Demande hors fournisseur actif"
        message="Cette demande n'appartient pas au fournisseur actif selectionne."
      />
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/supplier/quotation-requests"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux demandes recues
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Demande recue
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{request.clinicName}</h1>
            <p className="mt-2 text-slate-600">Fournisseur: {request.supplierName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuotationStatusBadge status={request.status} />
            {offer ? <SupplierOfferStatusBadge status={offer.status} /> : null}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Cette demande est en lecture fournisseur. Les actions Envoyer et Annuler restent
              reservees au portail clinique.
            </p>
          </div>
        </div>

        <div className="mt-6">
          {offer ? (
            <Link
              to={`/supplier/offers/${offer.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              <FileText className="h-4 w-4" />
              Voir l'offre
            </Link>
          ) : offerQuery.isLoading ? (
            <LoadingState label="Verification de l'offre..." />
          ) : (
            <Link
              to={`/supplier/quotation-requests/${request.id}/offer`}
              className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              <FileText className="h-4 w-4" />
              Creer une offre
            </Link>
          )}
        </div>

        {offer?.status === 'ACCEPTED' ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Commande</h2>
                {offer.hasOrder && offer.orderId ? (
                  <p className="mt-1 text-sm text-slate-600">
                    La clinique a cree la commande pour cette offre acceptee.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
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
          </div>
        ) : null}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Date livraison souhaitee" value={formatDateOnly(request.requestedDeliveryDate)} />
          <DetailItem label="Envoyee le" value={formatDateTime(request.sentAt)} />
          <DetailItem label="Expiration" value={formatDateTime(request.expiresAt)} />
          <DetailItem label="Creee le" value={formatDateTime(request.createdAt)} />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">Notes de la clinique</h2>
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
    </div>
  )
}
