import { useQuery } from '@tanstack/react-query'
import { getSuppliers } from '../../api/supplierApi'
import { getSupplierDisplayName } from '../../types/supplier'
import { useSelectedSupplier } from '../store/selectedSupplierStore'

export function useActiveSupplier() {
  const { selectedSupplierId, setSelectedSupplierId, clearSelectedSupplier } = useSelectedSupplier()
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers })
  const selectedSupplier = (suppliersQuery.data ?? []).find(
    (supplier) => supplier.id === selectedSupplierId,
  )

  return {
    selectedSupplierId,
    selectedSupplier,
    selectedSupplierName: selectedSupplier ? getSupplierDisplayName(selectedSupplier) : '',
    suppliers: suppliersQuery.data ?? [],
    suppliersQuery,
    setSelectedSupplierId,
    clearSelectedSupplier,
  }
}
