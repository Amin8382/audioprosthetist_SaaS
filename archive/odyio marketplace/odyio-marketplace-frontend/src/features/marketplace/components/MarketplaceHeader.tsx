import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Building2, ClipboardList, FileText, PackageSearch } from 'lucide-react'
import ViewModeSwitcher from '../../../shared/components/ViewModeSwitcher'
import { getModeHomePath, useViewMode } from '../../../shared/store/viewModeStore'
import ClinicSelector from '../clinic/components/ClinicSelector'
import { useActiveClinic } from '../clinic/hooks/useActiveClinic'
import NotificationBell from '../notification/components/NotificationBell'
import QuotationDraftDrawer from '../quotation/components/QuotationDraftDrawer'
import { useQuotationDraft } from '../quotation/store/quotationDraftStore'
import SupplierSelector from '../supplier/components/SupplierSelector'
import { useActiveSupplier } from '../supplier/hooks/useActiveSupplier'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-teal-50 text-teal-800'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
  ].join(' ')

export default function MarketplaceHeader() {
  const [isDraftOpen, setIsDraftOpen] = useState(false)
  const { mode } = useViewMode()
  const { selectedClinicId, selectedClinicName } = useActiveClinic()
  const { selectedSupplierId, selectedSupplierName } = useActiveSupplier()
  const { draft, lineCount, selectedQuantityCount } = useQuotationDraft()
  const isClinicMode = mode === 'CLINIC'
  const activeActorName = isClinicMode ? selectedClinicName : selectedSupplierName

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <NavLink to={getModeHomePath(mode)} className="flex items-center gap-3 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white">
              <PackageSearch className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold text-slate-950">Odyio Marketplace</span>
              <span className="block text-sm text-slate-500">
                {isClinicMode ? 'Portail Clinique' : 'Portail Fournisseur'}
              </span>
              {activeActorName ? (
                <span className="mt-0.5 block max-w-[260px] truncate text-xs font-medium text-teal-700">
                  {activeActorName}
                </span>
              ) : null}
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            <NotificationBell
              actorType={isClinicMode ? 'CLINIC' : 'SUPPLIER'}
              actorId={isClinicMode ? selectedClinicId : selectedSupplierId}
              actorName={activeActorName}
            />
            <ViewModeSwitcher />
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {isClinicMode ? (
            <>
              <NavLink to="/clinic/marketplace" className={navLinkClass}>
                <PackageSearch className="h-4 w-4" />
                Catalogue
              </NavLink>
              <NavLink to="/clinic/quotation-requests" className={navLinkClass}>
                <FileText className="h-4 w-4" />
                Demandes de devis
              </NavLink>
              <NavLink to="/clinic/orders" className={navLinkClass}>
                <ClipboardList className="h-4 w-4" />
                Commandes
              </NavLink>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDraftOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-100"
                >
                  <FileText className="h-4 w-4" />
                  {lineCount} produit{lineCount > 1 ? 's' : ''}
                  {draft.supplierName ? (
                    <span className="hidden max-w-40 truncate text-teal-700 sm:inline">
                      {draft.supplierName}
                    </span>
                  ) : null}
                </button>
                {isDraftOpen ? <QuotationDraftDrawer onClose={() => setIsDraftOpen(false)} /> : null}
              </div>

              {lineCount > 0 ? (
                <Link
                  to="/clinic/quotation-requests/new"
                  className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  Revoir ({selectedQuantityCount})
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <NavLink to="/supplier/products" className={navLinkClass}>
                <Building2 className="h-4 w-4" />
                Produits
              </NavLink>
              <NavLink to="/supplier/quotation-requests" className={navLinkClass}>
                <FileText className="h-4 w-4" />
                Demandes reçues
              </NavLink>
              <NavLink to="/supplier/offers" className={navLinkClass}>
                <FileText className="h-4 w-4" />
                Offres
              </NavLink>
              <NavLink to="/supplier/orders" className={navLinkClass}>
                <ClipboardList className="h-4 w-4" />
                Commandes reçues
              </NavLink>
            </>
          )}
        </nav>

        {isClinicMode ? <ClinicSelector /> : <SupplierSelector />}
      </div>
    </header>
  )
}
