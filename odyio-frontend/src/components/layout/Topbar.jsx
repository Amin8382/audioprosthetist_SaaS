import { Menu, Bell, LogOut } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 lg:flex-none" />

        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user || 'Utilisateur'}</p>
              <p className="text-xs text-gray-500">Odyio Clinique</p>
            </div>
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-semibold text-sm">
                {(user || 'U')[0].toUpperCase()}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
