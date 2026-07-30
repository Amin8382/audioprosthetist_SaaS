import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getCategories } from '../api/categoryApi'
import { getProducts } from '../api/productApi'
import { getSuppliers } from '../api/supplierApi'
import ProductCard from '../components/ProductCard'
import ProductFilters, { type ProductFiltersState } from '../components/ProductFilters'
import { useActiveClinic } from '../clinic/hooks/useActiveClinic'
import {
  defaultProductFiltersState,
  removeEmptyFilters,
  toProductApiFilters,
} from '../utils/productFilters'
import EmptyState from '../../../shared/components/EmptyState'
import ErrorState from '../../../shared/components/ErrorState'
import LoadingState from '../../../shared/components/LoadingState'
import PageHeader from '../../../shared/components/PageHeader'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'

function getFiltersFromSearchParams(searchParams: URLSearchParams): ProductFiltersState {
  return {
    search: searchParams.get('search') ?? defaultProductFiltersState.search,
    categoryId: searchParams.get('categoryId') ?? defaultProductFiltersState.categoryId,
    supplierId: searchParams.get('supplierId') ?? defaultProductFiltersState.supplierId,
    earSide: (searchParams.get('earSide') as ProductFiltersState['earSide']) ?? defaultProductFiltersState.earSide,
    availability:
      (searchParams.get('availability') as ProductFiltersState['availability']) ??
      defaultProductFiltersState.availability,
    active: 'active',
  }
}

function writeFiltersToSearchParams(filters: ProductFiltersState) {
  const nextParams = new URLSearchParams()

  if (filters.search.trim()) {
    nextParams.set('search', filters.search)
  }

  if (filters.categoryId !== 'all') {
    nextParams.set('categoryId', filters.categoryId)
  }

  if (filters.supplierId !== 'all') {
    nextParams.set('supplierId', filters.supplierId)
  }

  if (filters.earSide !== 'all') {
    nextParams.set('earSide', filters.earSide)
  }

  if (filters.availability !== 'all') {
    nextParams.set('availability', filters.availability)
  }

  return nextParams
}

export default function MarketplaceCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = getFiltersFromSearchParams(searchParams)
  const debouncedSearch = useDebouncedValue(filters.search)
  const { selectedClinicId } = useActiveClinic()

  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const productApiFilters = useMemo(
    () => removeEmptyFilters(toProductApiFilters(filters, debouncedSearch, { active: true })),
    [debouncedSearch, filters],
  )

  const productsQuery = useQuery({
    queryKey: ['products', productApiFilters],
    queryFn: () => getProducts(productApiFilters),
  })

  const isLoading = productsQuery.isLoading || suppliersQuery.isLoading || categoriesQuery.isLoading
  const isError = productsQuery.isError || suppliersQuery.isError || categoriesQuery.isError

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Catalogue produits"
        description="Parcourez les produits actifs proposes par les fournisseurs Odyio."
      />

      {!selectedClinicId ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Sélectionnez une clinique pour créer des demandes de devis.
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState label="Chargement du catalogue..." />
      ) : isError ? (
        <ErrorState message="Impossible de charger les produits, fournisseurs, categories ou cliniques." />
      ) : (
        <>
          <ProductFilters
            filters={filters}
            suppliers={suppliersQuery.data ?? []}
            categories={categoriesQuery.data ?? []}
            onChange={(nextFilters) => setSearchParams(writeFiltersToSearchParams(nextFilters))}
            onClear={() => setSearchParams(new URLSearchParams())}
          />

          {(productsQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="Aucun produit actif trouve"
              message="Aucun produit actif ne correspond aux filtres selectionnes."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {(productsQuery.data ?? []).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
