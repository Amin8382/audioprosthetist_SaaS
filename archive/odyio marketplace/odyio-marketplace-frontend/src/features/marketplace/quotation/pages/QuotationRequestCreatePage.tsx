import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import Breadcrumbs from '../../../../shared/components/Breadcrumbs'
import { getClinicDisplayName } from '../../types/clinic'
import { useActiveClinic } from '../../clinic/hooks/useActiveClinic'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import { getApiErrorMessage } from '../../../../shared/api/httpClient'
import {
  createQuotationRequest,
  sendQuotationRequest,
} from '../api/quotationRequestApi'
import { notificationQueryKeys } from '../../notification/api/notificationApi'
import QuotationLineEditor from '../components/QuotationLineEditor'
import {
  quotationRequestSchema,
  toQuotationRequestPayload,
  type QuotationRequestFormValues,
} from '../schemas/quotationRequestSchema'
import { useQuotationDraft } from '../store/quotationDraftStore'
import type { QuotationRequestResponse } from '../types/quotationRequest'

function FormError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="mt-1 text-sm text-red-700">{message}</p>
}

export default function QuotationRequestCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { draft, updateLine, removeLine, clearDraft } = useQuotationDraft()
  const { selectedClinicId, selectedClinic, clinicsQuery } = useActiveClinic()
  const [createdRequest, setCreatedRequest] = useState<QuotationRequestResponse | null>(null)

  const defaultValues = useMemo<QuotationRequestFormValues>(
    () => ({
      clinicId: selectedClinicId,
      supplierId: draft.supplierId ?? '',
      clinicNotes: '',
      requestedDeliveryDate: '',
      lines: draft.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        lineNotes: line.lineNotes,
      })),
    }),
    [draft.lines, draft.supplierId, selectedClinicId],
  )

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<QuotationRequestFormValues>({
    resolver: zodResolver(quotationRequestSchema),
    defaultValues,
  })

  useEffect(() => {
    setValue('clinicId', selectedClinicId, { shouldValidate: true })
    setValue('supplierId', draft.supplierId ?? '', { shouldValidate: true })
    setValue(
      'lines',
      draft.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        lineNotes: line.lineNotes,
      })),
      { shouldValidate: true },
    )
  }, [draft.lines, draft.supplierId, selectedClinicId, setValue])

  const createMutation = useMutation({
    mutationFn: createQuotationRequest,
    onSuccess: async (response) => {
      setCreatedRequest(response)
      clearDraft()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] }),
      ])
    },
  })

  const sendMutation = useMutation({
    mutationFn: sendQuotationRequest,
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['quotation-requests', response.id] }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
      ])
      navigate(`/clinic/quotation-requests/${response.id}`)
    },
  })

  const onSubmit = (values: QuotationRequestFormValues) => {
    if (!selectedClinicId) {
      return
    }

    createMutation.mutate(toQuotationRequestPayload(values))
  }

  const handleSend = () => {
    if (createdRequest) {
      sendMutation.mutate(createdRequest.id)
    }
  }

  const apiError = createMutation.error ?? sendMutation.error

  if (clinicsQuery.isLoading) {
    return <LoadingState label="Chargement des cliniques..." />
  }

  if (clinicsQuery.isError) {
    return <ErrorState message="Impossible de charger les cliniques." />
  }

  if (!selectedClinicId || !selectedClinic) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <ErrorState
          title="Clinique requise"
          message="Sélectionnez une clinique pour créer des demandes de devis."
        />
        <Link
          to="/clinic/marketplace"
          className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          Retour au catalogue
        </Link>
      </div>
    )
  }

  if (draft.clinicId && draft.clinicId !== selectedClinicId) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <ErrorState
          title="Brouillon lie a une autre clinique"
          message="Revenez au catalogue, changez de clinique et confirmez la suppression du brouillon actuel."
        />
        <Link
          to="/clinic/marketplace"
          className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          Retour au catalogue
        </Link>
      </div>
    )
  }

  if (createdRequest) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
            Demande creee
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Brouillon de demande de devis cree
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            La demande est en statut brouillon. Vous pouvez l'envoyer maintenant ou la garder
            pour plus tard.
          </p>
        </div>

        {apiError ? (
          <ErrorState title="Action impossible" message={getApiErrorMessage(apiError)} />
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-slate-500">Clinique</dt>
              <dd className="mt-1 font-semibold text-slate-950">{createdRequest.clinicName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Fournisseur</dt>
              <dd className="mt-1 font-semibold text-slate-950">{createdRequest.supplierName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Produits</dt>
              <dd className="mt-1 font-semibold text-slate-950">{createdRequest.lines.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Statut</dt>
              <dd className="mt-1 font-semibold text-slate-950">Brouillon</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to={`/clinic/quotation-requests/${createdRequest.id}`}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Garder en brouillon
            </Link>
            <button
              type="button"
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" />
              {sendMutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Catalogue', to: '/clinic/marketplace' },
          { label: 'Nouvelle demande' },
        ]}
      />

      <Link
        to="/clinic/marketplace"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          Demande de devis
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Creer une demande</h1>
        <p className="mt-2 text-slate-600">
          Selectionnez une clinique et verifiez les produits avant de creer le brouillon.
        </p>
      </div>

      {apiError ? (
        <ErrorState title="Creation impossible" message={getApiErrorMessage(apiError)} />
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('clinicId')} />
        <input type="hidden" {...register('supplierId')} />
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <span className="text-sm font-medium text-slate-700">Clinique active</span>
              <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                {getClinicDisplayName(selectedClinic)}
              </div>
              <FormError message={errors.clinicId?.message} />
            </div>

            <div>
              <span className="text-sm font-medium text-slate-700">Fournisseur</span>
              <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                {draft.supplierName || 'Ajoutez un produit depuis le catalogue'}
              </div>
              <FormError message={errors.supplierId?.message} />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Date de livraison souhaitee</span>
              <input
                type="date"
                {...register('requestedDeliveryDate')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              <FormError message={errors.requestedDeliveryDate?.message} />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Notes clinique</span>
              <textarea
                {...register('clinicNotes')}
                rows={4}
                className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              <FormError message={errors.clinicNotes?.message} />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-950">Produits selectionnes</h2>
            <Link
              to="/clinic/marketplace"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <FileText className="h-4 w-4" />
              Ajouter des produits
            </Link>
          </div>

          <FormError message={errors.lines?.message} />

          {draft.lines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
              Aucun produit selectionne pour cette demande.
            </div>
          ) : (
            draft.lines.map((line) => (
              <QuotationLineEditor
                key={line.productId}
                line={line}
                onQuantityChange={(quantity) => updateLine(line.productId, { quantity })}
                onNotesChange={(lineNotes) => updateLine(line.productId, { lineNotes })}
                onRemove={() => removeLine(line.productId)}
              />
            ))
          )}
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            to="/clinic/marketplace"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Continuer le catalogue
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
          >
            <FileText className="h-4 w-4" />
            {createMutation.isPending ? 'Creation...' : 'Creer le brouillon'}
          </button>
        </div>
      </form>
    </div>
  )
}
