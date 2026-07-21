import {
  Users,
  ShoppingCart,
  FileText,
  TrendingUp,
  Package,
  AlertTriangle,
} from 'lucide-react';

const stats = [
  {
    name: 'Clients actifs',
    value: '—',
    icon: Users,
    color: 'bg-blue-500',
    change: '+12%',
  },
  {
    name: 'Ventes ce mois',
    value: '— TND',
    icon: ShoppingCart,
    color: 'bg-green-500',
    change: '+8%',
  },
  {
    name: 'Factures en attente',
    value: '—',
    icon: FileText,
    color: 'bg-amber-500',
    change: '-3%',
  },
  {
    name: 'Chiffre d\'affaires',
    value: '— TND',
    icon: TrendingUp,
    color: 'bg-purple-500',
    change: '+15%',
  },
];

const quickActions = [
  { name: 'Nouveau client', href: '/clients/new', color: 'bg-blue-50 text-blue-700' },
  { name: 'Nouvelle vente', href: '/ventes/new', color: 'bg-green-50 text-green-700' },
  { name: 'Dépôt CNAM', href: '/cnam/new', color: 'bg-amber-50 text-amber-700' },
  { name: 'Vérifier stock', href: '/stocks', color: 'bg-purple-50 text-purple-700' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Vue d'ensemble de votre clinique</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card flex items-start gap-4">
            <div className={`${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-green-600 mt-1">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <a
                key={action.name}
                href={action.href}
                className={`${action.color} rounded-lg p-4 text-center font-medium hover:opacity-80 transition-opacity`}
              >
                {action.name}
              </a>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Stock faible</p>
                <p className="text-xs text-amber-600">3 articles en dessous du seuil minimum</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">CNAM en attente</p>
                <p className="text-xs text-blue-600">2 dossiers à suivre</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
