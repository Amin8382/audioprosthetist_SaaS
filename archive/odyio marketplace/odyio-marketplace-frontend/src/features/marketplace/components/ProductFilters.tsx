import { RotateCcw, Search } from 'lucide-react'
import type { Category } from '../types/category'
import type { EarSide } from '../types/product'
import { earSideLabels } from '../types/product'
import { getSupplierDisplayName, type Supplier } from '../types/supplier'

export type AvailabilityFilter = 'all' | 'available' | 'unavailable'
export type ActiveFilter = 'all' | 'active' | 'inactive'

export type ProductFiltersState = {
  search: string
  categoryId: string
  supplierId: string
  earSide: 'all' | EarSide
  availability: AvailabilityFilter
  active: ActiveFilter
}

type ProductFiltersProps = {
  filters: ProductFiltersState
  suppliers: Supplier[]
  categories: Category[]
  onChange: (filters: ProductFiltersState) => void
  onClear?: () => void
  showSupplierFilter?: boolean
  showActiveFilter?: boolean
}

export default function ProductFilters({
  filters,
  suppliers,
  categories,
  onChange,
  onClear,
  showSupplierFilter = true,
  showActiveFilter = false,
}: ProductFiltersProps) {
  const updateFilter = <Key extends keyof ProductFiltersState>(
    key: Key,
    value: ProductFiltersState[Key],
  ) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,2fr)_repeat(5,minmax(150px,1fr))]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Recherche</span>
          <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white px-3 focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Nom, marque, modele ou reference"
              className="w-full border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Categorie</span>
          <select
            value={filters.categoryId}
            onChange={(event) => updateFilter('categoryId', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="all">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        {showSupplierFilter ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Fournisseur</span>
            <select
              value={filters.supplierId}
              onChange={(event) => updateFilter('supplierId', event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            >
              <option value="all">Tous</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {getSupplierDisplayName(supplier)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Cote oreille</span>
          <select
            value={filters.earSide}
            onChange={(event) => updateFilter('earSide', event.target.value as ProductFiltersState['earSide'])}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="all">Tous</option>
            {Object.entries(earSideLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Disponibilite</span>
          <select
            value={filters.availability}
            onChange={(event) => updateFilter('availability', event.target.value as AvailabilityFilter)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            <option value="all">Toutes</option>
            <option value="available">Disponible</option>
            <option value="unavailable">Indisponible</option>
          </select>
        </label>

        {showActiveFilter ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Statut</span>
            <select
              value={filters.active}
              onChange={(event) => updateFilter('active', event.target.value as ActiveFilter)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            >
              <option value="all">Tous</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </label>
        ) : null}
      </div>
      {onClear ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reinitialiser les filtres
          </button>
        </div>
      ) : null}
    </section>
  )
}
