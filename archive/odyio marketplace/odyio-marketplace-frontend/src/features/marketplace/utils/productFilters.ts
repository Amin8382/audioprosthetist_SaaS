import type { ProductFilters } from '../api/productApi'
import type { ActiveFilter, AvailabilityFilter, ProductFiltersState } from '../components/ProductFilters'

export const defaultProductFiltersState: ProductFiltersState = {
  search: '',
  categoryId: 'all',
  supplierId: 'all',
  earSide: 'all',
  availability: 'all',
  active: 'all',
}

export function availabilityToBoolean(value: AvailabilityFilter) {
  if (value === 'available') {
    return true
  }

  if (value === 'unavailable') {
    return false
  }

  return undefined
}

export function activeToBoolean(value: ActiveFilter) {
  if (value === 'active') {
    return true
  }

  if (value === 'inactive') {
    return false
  }

  return undefined
}

export function toProductApiFilters(
  filters: ProductFiltersState,
  debouncedSearch: string,
  overrides: Partial<ProductFilters> = {},
): ProductFilters {
  return {
    search: debouncedSearch.trim() || undefined,
    supplierId: filters.supplierId === 'all' ? undefined : filters.supplierId,
    categoryId: filters.categoryId === 'all' ? undefined : filters.categoryId,
    earSide: filters.earSide === 'all' ? undefined : filters.earSide,
    available: availabilityToBoolean(filters.availability),
    active: activeToBoolean(filters.active),
    ...overrides,
  }
}

export function removeEmptyFilters(filters: ProductFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as ProductFilters
}
