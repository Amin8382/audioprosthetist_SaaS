import { Trash2 } from 'lucide-react'
import type { QuotationDraftLine } from '../types/quotationRequest'

type QuotationLineEditorProps = {
  line: QuotationDraftLine
  onQuantityChange: (quantity: number) => void
  onNotesChange: (notes: string) => void
  onRemove: () => void
}

export default function QuotationLineEditor({
  line,
  onQuantityChange,
  onNotesChange,
  onRemove,
}: QuotationLineEditorProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-950">{line.productName}</h3>
          <p className="mt-1 text-sm text-slate-500">Reference: {line.productReference || '-'}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Retirer
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Quantite</span>
          <input
            type="number"
            min={1}
            value={line.quantity}
            onChange={(event) => onQuantityChange(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Notes ligne</span>
          <input
            value={line.lineNotes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Precision optionnelle"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </label>
      </div>
    </div>
  )
}
