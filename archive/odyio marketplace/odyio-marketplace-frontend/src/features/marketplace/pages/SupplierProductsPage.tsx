import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, ImageIcon, Plus, Trash2 } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { getCategories } from '../api/categoryApi'
import { deactivateProduct, getSupplierProducts } from '../api/productApi'
import ProductFilters, { type ProductFiltersState } from '../components/ProductFilters'
import { useSelectedSupplier } from '../supplier/store/selectedSupplierStore'
import {
  defaultProductFiltersState,
  removeEmptyFilters,
  toProductApiFilters,
} from '../utils/productFilters'
import EmptyState from '../../../shared/components/EmptyState'
import ErrorState from '../../../shared/components/ErrorState'
import LoadingState from '../../../shared/components/LoadingState'
import PageHeader from '../../../shared/components/PageHeader'
import SuccessMessage from '../../../shared/components/SuccessMessage'
import { getApiErrorMessage } from '../../../shared/api/httpClient'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { useConfirmDialog } from '../../../shared/hooks/useConfirmDialog'
import { resolveMarketplaceAssetUrl } from '../utils/assetUrls'

function getFiltersFromSearchParams(searchParams: URLSearchParams): ProductFiltersState {
  return {
    search: searchParams.get('search') ?? defaultProductFiltersState.search,
    categoryId: searchParams.get('categoryId') ?? defaultProductFiltersState.categoryId,
    supplierId: 'all',
    earSide: (searchParams.get('earSide') as ProductFiltersState['earSide']) ?? defaultProductFiltersState.earSide,
    availability:
      (searchParams.get('availability') as ProductFiltersState['availability']) ??
      defaultProductFiltersState.availability,
    active: (searchParams.get('active') as ProductFiltersState['active']) ?? defaultProductFiltersState.active,
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

  if (filters.earSide !== 'all') {
    nextParams.set('earSide', filters.earSide)
  }

  if (filters.availability !== 'all') {
    nextParams.set('availability', filters.availability)
  }

  if (filters.active !== 'all') {
    nextParams.set('active', filters.active)
  }

  return nextParams
}

export default function SupplierProductsPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = getFiltersFromSearchParams(searchParams)
  const debouncedSearch = useDebouncedValue(filters.search)
  const { selectedSupplierId } = useSelectedSupplier()
  const { confirm, dialog } = useConfirmDialog()
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { successMessage?: string } | null)?.successMessage ?? null,
  )

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const productApiFilters = useMemo(() => {
    const apiFilters = toProductApiFilters(filters, debouncedSearch)
    return removeEmptyFilters({
      search: apiFilters.search,
      categoryId: apiFilters.categoryId,
      earSide: apiFilters.earSide,
      available: apiFilters.available,
      active: apiFilters.active,
    })
  }, [debouncedSearch, filters])

  const productsQuery = useQuery({
    queryKey: ['supplier-products', selectedSupplierId, productApiFilters],
    queryFn: () => getSupplierProducts(selectedSupplierId, productApiFilters),
    enabled: Boolean(selectedSupplierId),
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateProduct,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supplier-products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ])
      setSuccessMessage('Le produit a ete desactive.')
    },
  })

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({
      title: 'Desactiver le produit',
      message: 'Ce produit ne sera plus visible comme actif dans le catalogue.',
      confirmLabel: 'Desactiver',
      destructive: true,
    })

    if (confirmed) {
      deactivateMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <PageHeader
        eyebrow="Fournisseurs"
        title="Gestion des produits"
        description="Les produits affiches sont limites au fournisseur actif."
        actions={
          <Link
            to="/supplier/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" />
            Ajouter un produit
          </Link>
        }
      />

      {deactivateMutation.isError ? (
        <ErrorState
          title="Desactivation impossible"
          message={getApiErrorMessage(deactivateMutation.error)}
        />
      ) : null}

      {successMessage ? <SuccessMessage message={successMessage} /> : null}

      {categoriesQuery.isLoading ? (
        <LoadingState label="Chargement des filtres..." />
      ) : categoriesQuery.isError ? (
        <ErrorState message="Impossible de charger les categories." />
      ) : !selectedSupplierId ? (
        <EmptyState
          title="Aucun fournisseur actif"
          message="Selectionnez un fournisseur pour afficher ses produits."
        />
      ) : (
        <>
          <ProductFilters
            filters={filters}
            suppliers={[]}
            categories={categoriesQuery.data ?? []}
            onChange={(nextFilters) => setSearchParams(writeFiltersToSearchParams(nextFilters))}
            onClear={() => setSearchParams(new URLSearchParams())}
            showSupplierFilter={false}
            showActiveFilter
          />

          {productsQuery.isLoading ? (
            <LoadingState label="Chargement des produits..." />
          ) : productsQuery.isError ? (
            <ErrorState message="Impossible de charger les produits de ce fournisseur." />
          ) : (productsQuery.data ?? []).length === 0 ? (
            <EmptyState title="Aucun produit" message="Aucun produit ne correspond aux filtres." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Produit</th>
                      <th className="px-4 py-3">Marque</th>
                      <th className="px-4 py-3">Fournisseur</th>
                      <th className="px-4 py-3">Categorie</th>
                      <th className="px-4 py-3">Disponibilite</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(productsQuery.data ?? []).map((product) => {
                      const primaryImage = product.primaryImage
                      const primaryImageSrc = resolveMarketplaceAssetUrl(primaryImage?.imageUrl)

                      return (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                              {primaryImageSrc ? (
                                <img
                                  src={primaryImageSrc}
                                  alt={primaryImage?.altText?.trim() || `${product.name} - image produit`}
                                  className="h-full w-full object-contain p-1.5"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                            <span className="font-medium text-slate-950">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{product.brand || '-'}</td>
                        <td className="px-4 py-4 text-slate-700">{product.supplierName}</td>
                        <td className="px-4 py-4 text-slate-700">{product.categoryName}</td>
                        <td className="px-4 py-4">
                          <span
                            className={[
                              'rounded-full px-2.5 py-1 text-xs font-medium',
                              product.available
                                ? 'bg-teal-50 text-teal-800'
                                : 'bg-slate-100 text-slate-600',
                            ].join(' ')}
                          >
                            {product.available ? 'Disponible' : 'Indisponible'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={[
                              'rounded-full px-2.5 py-1 text-xs font-medium',
                              product.active ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800',
                            ].join(' ')}
                          >
                            {product.active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/supplier/products/${product.id}/edit`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Modifier
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDeactivate(product.id)}
                              disabled={!product.active || deactivateMutation.isPending}
                              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:border-slate-200 disabled:text-slate-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Desactiver
                            </button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
