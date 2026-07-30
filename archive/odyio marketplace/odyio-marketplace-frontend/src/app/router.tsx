import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import {
  MarketplaceCatalogPage,
  ClinicOrderDetailsPage,
  ClinicOrdersPage,
  ProductDetailsPage,
  ProductFormPage,
  QuotationRequestCreatePage,
  QuotationRequestDetailsPage,
  QuotationRequestsPage,
  SupplierOfferDetailsPage,
  SupplierOfferFormPage,
  SupplierOffersPage,
  SupplierOrderDetailsPage,
  SupplierOrdersPage,
  SupplierProductsPage,
  SupplierQuotationRequestDetailsPage,
  SupplierQuotationRequestsPage,
} from './lazyPages'
import LoadingState from '../shared/components/LoadingState'
import {
  LegacyProductRedirect,
  LegacyQuotationRequestRedirect,
  ModeHomeRedirect,
  ModeRoute,
} from '../shared/components/ModeRoute'
import MainLayout from '../shared/layout/MainLayout'

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<LoadingState label="Chargement de la page..." />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ModeHomeRedirect />,
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: '/clinic/marketplace',
        element: lazyRoute(
          <ModeRoute mode="CLINIC">
            <MarketplaceCatalogPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/clinic/marketplace/products/:id',
        element: lazyRoute(
          <ModeRoute mode="CLINIC">
            <ProductDetailsPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/clinic/quotation-requests/new',
        element: lazyRoute(
          <ModeRoute mode="CLINIC">
            <QuotationRequestCreatePage />
          </ModeRoute>,
        ),
      },
      {
        path: '/clinic/quotation-requests',
        element: lazyRoute(
          <ModeRoute mode="CLINIC">
            <QuotationRequestsPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/clinic/quotation-requests/:id',
        element: lazyRoute(
          <ModeRoute mode="CLINIC">
            <QuotationRequestDetailsPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/clinic/orders',
        element: lazyRoute(
          <ModeRoute mode="CLINIC">
            <ClinicOrdersPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/clinic/orders/:id',
        element: lazyRoute(
          <ModeRoute mode="CLINIC">
            <ClinicOrderDetailsPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/products',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <SupplierProductsPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/products/new',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <ProductFormPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/products/:id/edit',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <ProductFormPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/quotation-requests',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <SupplierQuotationRequestsPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/quotation-requests/:id',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <SupplierQuotationRequestDetailsPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/quotation-requests/:id/offer',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <SupplierOfferFormPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/offers',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <SupplierOffersPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/offers/:id',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <SupplierOfferDetailsPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/orders',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <SupplierOrdersPage />
          </ModeRoute>,
        ),
      },
      {
        path: '/supplier/orders/:id',
        element: lazyRoute(
          <ModeRoute mode="SUPPLIER">
            <SupplierOrderDetailsPage />
          </ModeRoute>,
        ),
      },
    ],
  },
  {
    path: '/marketplace',
    element: <Navigate to="/clinic/marketplace" replace />,
  },
  {
    path: '/marketplace/products/:id',
    element: <LegacyProductRedirect />,
  },
  {
    path: '/quotation-requests',
    element: <Navigate to="/clinic/quotation-requests" replace />,
  },
  {
    path: '/quotation-requests/new',
    element: <Navigate to="/clinic/quotation-requests/new" replace />,
  },
  {
    path: '/quotation-requests/:id',
    element: <LegacyQuotationRequestRedirect />,
  },
  {
    path: '*',
    element: <ModeHomeRedirect />,
  },
])
