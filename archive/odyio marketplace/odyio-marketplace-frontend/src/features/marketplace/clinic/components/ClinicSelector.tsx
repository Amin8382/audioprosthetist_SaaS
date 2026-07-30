import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getClinicDisplayName } from '../../types/clinic'
import { useQuotationDraft } from '../../quotation/store/quotationDraftStore'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import { useConfirmDialog } from '../../../../shared/hooks/useConfirmDialog'
import { useActiveClinic } from '../hooks/useActiveClinic'

export default function ClinicSelector() {
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirmDialog()
  const { selectedClinicId, setSelectedClinicId, clearSelectedClinic, clinics, clinicsQuery } =
    useActiveClinic()
  const { draft, clearDraft } = useQuotationDraft()

  useEffect(() => {
    if (!clinicsQuery.data || !selectedClinicId) {
      return
    }

    const exists = clinics.some((clinic) => clinic.id === selectedClinicId)

    if (!exists) {
      clearSelectedClinic()
      void queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] })
    }
  }, [clearSelectedClinic, clinics, clinicsQuery.data, queryClient, selectedClinicId])

  const handleChange = async (clinicId: string) => {
    if (clinicId === selectedClinicId) {
      return
    }

    if (draft.lines.length > 0) {
      const confirmed = await confirm({
        title: 'Changer de clinique active',
        message:
          'Changer de clinique supprimera le brouillon de demande de devis actuel. Continuer ?',
        confirmLabel: 'Changer et vider le brouillon',
        destructive: true,
      })

      if (!confirmed) {
        return
      }

      clearDraft()
    }

    setSelectedClinicId(clinicId)
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clinic-quotation-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ])
  }

  if (clinicsQuery.isLoading) {
    return <LoadingState label="Chargement des cliniques..." />
  }

  if (clinicsQuery.isError) {
    return <ErrorState message="Impossible de charger les cliniques." />
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {dialog}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <label className="block w-full max-w-md">
          <span className="text-sm font-medium text-slate-700">Clinique active</span>
          <select
            value={selectedClinicId}
            onChange={(event) => void handleChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="">Selectionner une clinique</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {getClinicDisplayName(clinic)}
              </option>
            ))}
          </select>
        </label>
        <p className="max-w-xl text-sm leading-6 text-slate-500">
          Sélection temporaire en attendant l’authentification.
        </p>
      </div>
    </section>
  )
}
