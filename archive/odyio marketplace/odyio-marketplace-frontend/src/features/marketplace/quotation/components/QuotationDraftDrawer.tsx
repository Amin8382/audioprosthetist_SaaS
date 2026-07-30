import { FileText, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useConfirmDialog } from '../../../../shared/hooks/useConfirmDialog'
import { useQuotationDraft } from '../store/quotationDraftStore'

type QuotationDraftDrawerProps = {
  onClose?: () => void
}

export default function QuotationDraftDrawer({ onClose }: QuotationDraftDrawerProps) {
  const { draft, removeLine, clearDraft } = useQuotationDraft()
  const { confirm, dialog } = useConfirmDialog()

  const handleClear = async () => {
    const confirmed = await confirm({
      title: 'Vider le brouillon',
      message: 'Tous les produits selectionnes pour cette demande de devis seront retires.',
      confirmLabel: 'Vider le brouillon',
      destructive: true,
    })

    if (confirmed) {
      clearDraft()
      onClose?.()
    }
  }

  return (
    <div className="absolute right-0 top-full z-20 mt-3 w-[min(92vw,420px)] rounded-lg border border-slate-200 bg-white p-4 text-left shadow-lg">
      {dialog}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-950">Demande de devis</h2>
          <p className="mt-1 text-sm text-slate-500">{draft.supplierName || 'Aucun fournisseur selectionne'}</p>
        </div>
        {draft.lines.length > 0 ? (
          <button
            type="button"
            onClick={() => void handleClear()}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Vider
          </button>
        ) : null}
      </div>

      {draft.lines.length === 0 ? (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          Aucun produit selectionne.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {draft.lines.map((line) => (
            <div key={line.productId} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{line.productName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Quantite: {line.quantity} · Reference: {line.productReference || '-'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(line.productId)}
                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
                  aria-label="Retirer le produit"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <Link
            to="/clinic/quotation-requests/new"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            <FileText className="h-4 w-4" />
            Revoir / creer la demande
          </Link>
        </div>
      )}
    </div>
  )
}
