import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSupplierDisplayName } from '../../types/supplier'
import ErrorState from '../../../../shared/components/ErrorState'
import LoadingState from '../../../../shared/components/LoadingState'
import { useActiveSupplier } from '../hooks/useActiveSupplier'

export default function SupplierSelector() {
  const queryClient = useQueryClient()
  const { selectedSupplierId, setSelectedSupplierId, clearSelectedSupplier, suppliers, suppliersQuery } =
    useActiveSupplier()

  useEffect(() => {
    if (!suppliersQuery.data || !selectedSupplierId) {
      return
    }

    const exists = suppliers.some((supplier) => supplier.id === selectedSupplierId)

    if (!exists) {
      clearSelectedSupplier()
      void queryClient.invalidateQueries({ queryKey: ['supplier-products'] })
      void queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] })
    }
  }, [clearSelectedSupplier, queryClient, selectedSupplierId, suppliers, suppliersQuery.data])

  const handleChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId)
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] }),
      queryClient.invalidateQueries({ queryKey: ['supplier-quotation-requests'] }),
    ])
  }

  if (suppliersQuery.isLoading) {
    return <LoadingState label="Chargement des fournisseurs..." />
  }

  if (suppliersQuery.isError) {
    return <ErrorState message="Impossible de charger les fournisseurs." />
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <label className="block w-full max-w-md">
          <span className="text-sm font-medium text-slate-700">Fournisseur actif</span>
          <select
            value={selectedSupplierId}
            onChange={(event) => handleChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="">Selectionner un fournisseur</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {getSupplierDisplayName(supplier)}
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
