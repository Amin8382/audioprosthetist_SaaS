import { useEffect, useId, useRef, useState } from 'react'
import ErrorState from '../../../../shared/components/ErrorState'

const maxReasonLength = 1000

type CancelOrderDialogProps = {
  open: boolean
  isPending?: boolean
  errorMessage?: string | null
  onCancel: () => void
  onConfirm: (reason?: string) => void
}

export default function CancelOrderDialog({
  open,
  isPending = false,
  errorMessage,
  onCancel,
  onConfirm,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState('')
  const titleId = useId()
  const reasonId = useId()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isTooLong = reason.length > maxReasonLength
  const trimmedReason = reason.trim()

  useEffect(() => {
    if (!open) {
      setReason('')
      return
    }

    textareaRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onCancel, open])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-950">
          Annuler cette commande ?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Cette action est définitive et n’est possible que tant que le fournisseur n’a pas confirmé
          la commande.
        </p>

        {errorMessage ? (
          <div className="mt-4" aria-live="assertive">
            <ErrorState title="Annulation impossible" message={errorMessage} />
          </div>
        ) : null}

        <label htmlFor={reasonId} className="mt-5 block">
          <span className="text-sm font-medium text-slate-700">
            Motif de l’annulation — facultatif
          </span>
          <textarea
            id={reasonId}
            ref={textareaRef}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={5}
            maxLength={maxReasonLength + 1}
            aria-invalid={isTooLong}
            className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          />
        </label>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <p className={isTooLong ? 'text-red-700' : 'text-slate-500'}>
            {reason.length}/{maxReasonLength} caractères
          </p>
          {isTooLong ? <p className="text-red-700">Le motif ne doit pas dépasser 1000 caractères.</p> : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmedReason || undefined)}
            disabled={isPending || isTooLong}
            className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
          >
            {isPending ? 'Annulation...' : 'Annuler la commande'}
          </button>
        </div>
      </div>
    </div>
  )
}
