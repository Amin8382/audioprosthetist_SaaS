import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Users, FileText, Receipt, Truck, Package, 
  Wallet, Settings, LogOut, Bell, Menu, X,
  Store, ShoppingCart, ListOrdered, Upload
} from 'lucide-react';

const navItems = [
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/ventes', label: 'Ventes / BL', icon: FileText },
  { path: '/factures', label: 'Facturation', icon: Receipt },
  { path: '/fournisseurs', label: 'Fournisseurs', icon: Truck },
  { path: '/stocks', label: 'Stocks', icon: Package },
  { path: '/tresorerie', label: 'Trésorerie', icon: Wallet },
  { path: '/marketplace', label: 'Marketplace', icon: Store },
  { path: '/catalogue', label: 'Catalogue', icon: ShoppingCart },
  { path: '/noah/import', label: 'Noah Import', icon: Upload },
  { path: '/configuration', label: 'Configuration', icon: Settings },
];

const fournisseurNavItems = [
  { path: '/fournisseur/catalogue', label: 'Mon catalogue', icon: ShoppingCart },
  { path: '/fournisseur/commandes', label: 'Commandes', icon: ListOrdered },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r transform transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-primary-600">Odyio</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden"><X size={20} /></button>
        </div>
        <nav className="p-4 space-y-1">
          {(user?.role === 'FOURNISSEUR' ? fournisseurNavItems : navItems).map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden"><Menu size={20} /></button>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm text-gray-600">{user?.fullName || user?.email}</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{user?.role}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600">
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
