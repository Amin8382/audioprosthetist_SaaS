export type Supplier = {
  id: string
  name?: string | null
  companyName?: string | null
  active?: boolean
}

export function getSupplierDisplayName(supplier: Supplier) {
  return supplier.companyName ?? supplier.name ?? 'Fournisseur sans nom'
}
