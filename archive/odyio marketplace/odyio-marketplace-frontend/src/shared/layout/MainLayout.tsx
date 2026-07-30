import { Outlet } from 'react-router-dom'
import MarketplaceHeader from '../../features/marketplace/components/MarketplaceHeader'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <MarketplaceHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
