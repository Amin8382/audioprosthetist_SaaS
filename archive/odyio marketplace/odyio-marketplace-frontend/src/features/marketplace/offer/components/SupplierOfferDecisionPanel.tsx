import { CheckCircle2, Clock, FileClock, Undo2, XCircle } from 'lucide-react'
import { formatDateTime } from '../../../../shared/utils/dateFormat'
import type { SupplierOffer } from '../types/supplierOffer'

type SupplierOfferDecisionPanelProps = {
  offer: SupplierOffer
  audience?: 'clinic' | 'supplier'
}

export default function SupplierOfferDecisionPanel({
  offer,
  audience = 'clinic',
}: SupplierOfferDecisionPanelProps) {
  if (offer.status === 'SUBMITTED') {
    return null
  }

  if (offer.status === 'ACCEPTED') {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">Offre acceptée</h3>
            <p className="mt-1 text-sm">Décision finale enregistrée le {formatDateTime(offer.decisionAt)}.</p>
            <p className="mt-2 text-sm">
              La décision commerciale est définitive. La commande sera traitée dans une étape suivante.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (offer.status === 'REJECTED') {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-950">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">Offre refusée</h3>
            <p className="mt-1 text-sm">Décision finale enregistrée le {formatDateTime(offer.decisionAt)}.</p>
            <div className="mt-3 rounded-md border border-red-200 bg-white/70 p-3 text-sm">
              <p className="font-medium">Motif communiqué</p>
              <p className="mt-1 whitespace-pre-line">
                {offer.rejectionReason?.trim() || 'Aucun motif communiqué.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (offer.status === 'WITHDRAWN') {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-slate-800">
        <div className="flex items-start gap-3">
          <Undo2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">Offre retirée</h3>
            <p className="mt-1 text-sm">
              Le fournisseur a retiré cette offre. Elle reste consultable en lecture seule.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (offer.status === 'EXPIRED') {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">Offre expirée</h3>
            <p className="mt-1 text-sm">La période de validité de cette offre est terminée.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
      <div className="flex items-start gap-3">
        <FileClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">Offre en préparation</h3>
          <p className="mt-1 text-sm">
            {audience === 'clinic'
              ? "Cette offre n'a pas encore été formellement soumise par le fournisseur."
              : 'Cette offre est encore en brouillon et peut être modifiée.'}
          </p>
        </div>
      </div>
    </section>
  )
}
