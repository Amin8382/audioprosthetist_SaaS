import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Breadcrumbs from '../../../../shared/components/Breadcrumbs'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import { getApiErrorMessage, isNotFoundError } from '../../../../shared/api/httpClient'
import { formatDateOnly } from '../../../../shared/utils/dateFormat'
import { notificationQueryKeys } from '../../notification/api/notificationApi'
import { getSupplierScopedQuotationRequest } from '../../quotation/api/quotationRequestApi'
import { useSelectedSupplier } from '../../supplier/store/selectedSupplierStore'
import {
  createOffer,
  getOfferByQuotationRequest,
  submitOffer,
  updateOffer,
} from '../api/offerApi'
import {
  supplierOfferFormSchema,
  toSupplierOfferCreatePayload,
  toSupplierOfferUpdatePayload,
  type SupplierOfferFormValues,
} from '../schemas/supplierOfferSchema'
import SupplierOfferStatusBadge from '../components/SupplierOfferStatusBadge'

function FormError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="mt-1 text-sm text-red-700">{message}</p>
}

function buildDefaultValues(lineIds: string[]): SupplierOfferFormValues {
  return {
    supplierNotes: '',
    deliveryDelayDays: 0,
    validUntil: '',
    lines: lineIds.map((quotationRequestLineId) => ({
      quotationRequestLineId,
      unitPrice: 0,
      lineNotes: '',
    })),
  }
}

export default function SupplierOfferFormPage() {
  const { id: quotationRequestId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { selectedSupplierId } = useSelectedSupplier()

  const quotationRequestQuery = useQuery({
    queryKey: ['supplier-quotation-requests', selectedSupplierId, quotationRequestId],
    queryFn: () => getSupplierScopedQuotationRequest(selectedSupplierId, quotationRequestId as string),
    enabled: Boolean(quotationRequestId && selectedSupplierId),
  })

  const existingOfferQuery = useQuery({
    queryKey: ['offer-by-quotation', quotationRequestId],
    queryFn: () => getOfferByQuotationRequest(quotationRequestId as string),
    enabled: Boolean(quotationRequestId),
    retry: false,
  })

  const existingOffer = existingOfferQuery.data
  const offerNotFound = existingOfferQuery.isError && isNotFoundError(existingOfferQuery.error)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<SupplierOfferFormValues>({
    resolver: zodResolver(supplierOfferFormSchema),
    defaultValues: buildDefaultValues([]),
  })

  useEffect(() => {
    if (existingOffer) {
      reset({
        supplierNotes: existingOffer.supplierNotes ?? '',
        deliveryDelayDays: existingOffer.deliveryDelayDays,
        validUntil: existingOffer.validUntil,
        lines: existingOffer.lines.map((line) => ({
          quotationRequestLineId: line.quotationRequestLineId,
          unitPrice: line.unitPrice,
          lineNotes: line.lineNotes ?? '',
        })),
      })
      return
    }

    if (quotationRequestQuery.data && (offerNotFound || !existingOfferQuery.isFetching)) {
      reset(buildDefaultValues(quotationRequestQuery.data.lines.map((line) => line.id)))
    }
  }, [
    existingOffer,
    existingOfferQuery.isFetching,
    offerNotFound,
    quotationRequestQuery.data,
    reset,
  ])

  const invalidateOfferQueries = async (offerId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['offers'] }),
      queryClient.invalidateQueries({ queryKey: ['offer-by-quotation', quotationRequestId] }),
      queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] }),
      offerId ? queryClient.invalidateQueries({ queryKey: ['offer', offerId] }) : Promise.resolve(),
    ])
  }

  const createMutation = useMutation({
    mutationFn: (values: SupplierOfferFormValues) =>
      createOffer(
        toSupplierOfferCreatePayload(
          values,
          quotationRequestId as string,
          selectedSupplierId,
        ),
      ),
    onSuccess: async (offer) => {
      await invalidateOfferQueries(offer.id)
      navigate(`/supplier/offers/${offer.id}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (values: SupplierOfferFormValues) =>
      updateOffer(existingOffer?.id as string, toSupplierOfferUpdatePayload(values)),
    onSuccess: async (offer) => {
      await invalidateOfferQueries(offer.id)
      navigate(`/supplier/offers/${offer.id}`)
    },
  })

  const submitMutation = useMutation({
    mutationFn: submitOffer,
    onSuccess: async (offer) => {
      await invalidateOfferQueries(offer.id)
      await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all })
      navigate(`/supplier/offers/${offer.id}`)
    },
  })

  const saveDraft = async (values: SupplierOfferFormValues) => {
    if (existingOffer) {
      return updateMutation.mutateAsync(values)
    }

    return createMutation.mutateAsync(values)
  }

  const onSaveDraft = (values: SupplierOfferFormValues) => {
    void saveDraft(values)
  }

  const onSubmitOffer = async () => {
    const offer = await saveDraft(getValues())
    submitMutation.mutate(offer.id)
  }

  const isLoading =
    quotationRequestQuery.isLoading || (existingOfferQuery.isLoading && !offerNotFound)
  const apiError = createMutation.error ?? updateMutation.error ?? submitMutation.error
  const isSubmitting = createMutation.isPending || updateMutation.isPending || submitMutation.isPending

  if (!quotationRequestId) {
    return <ErrorState message="Identifiant de demande manquant." />
  }

  if (!selectedSupplierId) {
    return (
      <ErrorState
        title="Fournisseur requis"
        message="Selectionnez un fournisseur actif avant de creer une offre."
      />
    )
  }

  if (isLoading) {
    return <LoadingState label="Chargement de la demande et de l'offre..." />
  }

  if (quotationRequestQuery.isError || !quotationRequestQuery.data) {
    return <ErrorState message="Impossible de charger la demande de devis." />
  }

  if (existingOfferQuery.isError && !offerNotFound) {
    return <ErrorState message="Impossible de verifier l'offre existante." />
  }

  const quotationRequest = quotationRequestQuery.data

  if (quotationRequest.supplierId !== selectedSupplierId) {
    return (
      <ErrorState
        title="Demande hors fournisseur actif"
        message="Cette demande de devis n'appartient pas au fournisseur actif."
      />
    )
  }

  if (existingOffer && existingOffer.status !== 'DRAFT') {
    return (
      <div className="space-y-6">
        <ErrorState
          title="Offre non modifiable"
          message="Cette offre n'est plus en brouillon. Les offres soumises, acceptées, refusées, retirées ou expirées sont disponibles en consultation uniquement."
        />
        <Link
          to={`/supplier/offers/${existingOffer.id}`}
          className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          Consulter l'offre
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Demandes recues', to: '/supplier/quotation-requests' },
          { label: quotationRequest.clinicName, to: `/supplier/quotation-requests/${quotationRequest.id}` },
          { label: existingOffer ? 'Modifier l offre' : 'Creer une offre' },
        ]}
      />

      <Link
        to={`/supplier/quotation-requests/${quotationRequest.id}`}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la demande
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Offre fournisseur
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {existingOffer ? 'Modifier le brouillon' : 'Créer une offre'}
            </h1>
            <p className="mt-2 text-slate-600">
              Clinique: {quotationRequest.clinicName} · Demande {quotationRequest.id.slice(0, 8)}
            </p>
          </div>
          {existingOffer ? <SupplierOfferStatusBadge status={existingOffer.status} /> : null}
        </div>
      </section>

      {apiError ? (
        <ErrorState title="Enregistrement impossible" message={getApiErrorMessage(apiError)} />
      ) : null}

      <form onSubmit={handleSubmit(onSaveDraft)} className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Delai de livraison (jours)</span>
              <input
                type="number"
                min={0}
                {...register('deliveryDelayDays')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              <FormError message={errors.deliveryDelayDays?.message} />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Validite de l'offre</span>
              <input
                type="date"
                {...register('validUntil')}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              <FormError message={errors.validUntil?.message} />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Notes fournisseur</span>
              <textarea
                rows={4}
                {...register('supplierNotes')}
                className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              <FormError message={errors.supplierNotes?.message} />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-semibold text-slate-950">Produits demandés</h2>
            <p className="mt-1 text-sm text-slate-600">
              Les produits et quantites proviennent de la demande et ne sont pas modifiables.
            </p>
          </div>
          <div className="divide-y divide-slate-200">
            {quotationRequest.lines.map((line, index) => (
              <div key={line.id} className="grid gap-4 p-5 lg:grid-cols-[1.5fr_120px_180px_1fr]">
                <input type="hidden" {...register(`lines.${index}.quotationRequestLineId`)} />
                <div>
                  <p className="font-semibold text-slate-950">{line.productName}</p>
                  <p className="mt-1 text-sm text-slate-500">Reference: {line.productReference || '-'}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Notes clinique: {line.lineNotes || '-'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-700">Quantite</span>
                  <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                    {line.quantity}
                  </div>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Prix unitaire</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...register(`lines.${index}.unitPrice`)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                  <FormError message={errors.lines?.[index]?.unitPrice?.message} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Notes ligne</span>
                  <input
                    {...register(`lines.${index}.lineNotes`)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                  />
                  <FormError message={errors.lines?.[index]?.lineNotes?.message} />
                </label>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:text-slate-400"
          >
            <Save className="h-4 w-4" />
            {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer le brouillon'}
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmitOffer)}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:bg-slate-300"
          >
            <Send className="h-4 w-4" />
            {submitMutation.isPending ? 'Soumission...' : 'Soumettre l offre'}
          </button>
        </div>
      </form>

      <p className="text-sm text-slate-500">
        Date de livraison souhaitee par la clinique: {formatDateOnly(quotationRequest.requestedDeliveryDate)}
      </p>
    </div>
  )
}
