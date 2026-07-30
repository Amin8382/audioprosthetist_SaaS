import { lazy } from 'react'

export const MarketplaceCatalogPage = lazy(
  () => import('../features/marketplace/pages/MarketplaceCatalogPage'),
)
export const ProductDetailsPage = lazy(() => import('../features/marketplace/pages/ProductDetailsPage'))
export const ProductFormPage = lazy(() => import('../features/marketplace/pages/ProductFormPage'))
export const SupplierProductsPage = lazy(() => import('../features/marketplace/pages/SupplierProductsPage'))
export const SupplierOfferDetailsPage = lazy(
  () => import('../features/marketplace/offer/pages/SupplierOfferDetailsPage'),
)
export const SupplierOfferFormPage = lazy(
  () => import('../features/marketplace/offer/pages/SupplierOfferFormPage'),
)
export const SupplierOffersPage = lazy(() => import('../features/marketplace/offer/pages/SupplierOffersPage'))
export const ClinicOrdersPage = lazy(
  () => import('../features/marketplace/order/pages/ClinicOrdersPage'),
)
export const ClinicOrderDetailsPage = lazy(
  () => import('../features/marketplace/order/pages/ClinicOrderDetailsPage'),
)
export const SupplierOrdersPage = lazy(
  () => import('../features/marketplace/order/pages/SupplierOrdersPage'),
)
export const SupplierOrderDetailsPage = lazy(
  () => import('../features/marketplace/order/pages/SupplierOrderDetailsPage'),
)
export const QuotationRequestCreatePage = lazy(
  () => import('../features/marketplace/quotation/pages/QuotationRequestCreatePage'),
)
export const QuotationRequestDetailsPage = lazy(
  () => import('../features/marketplace/quotation/pages/QuotationRequestDetailsPage'),
)
export const QuotationRequestsPage = lazy(
  () => import('../features/marketplace/quotation/pages/QuotationRequestsPage'),
)
export const SupplierQuotationRequestDetailsPage = lazy(
  () => import('../features/marketplace/supplier/pages/SupplierQuotationRequestDetailsPage'),
)
export const SupplierQuotationRequestsPage = lazy(
  () => import('../features/marketplace/supplier/pages/SupplierQuotationRequestsPage'),
)
