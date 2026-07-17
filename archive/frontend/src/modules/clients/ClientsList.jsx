import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Search } from 'lucide-react';

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/clients', { params: { search, size: 50 } })
      .then(r => setClients(r.data.content || []))
      .catch(() => {});
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link to="/clients/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus size={18} /> Nouveau client
        </Link>
      </div>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-3 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg" placeholder="Rechercher un client..." />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3">Code</th>
            <th className="text-left px-4 py-3">Nom</th>
            <th className="text-left px-4 py-3">Téléphone</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{c.code}</td>
                <td className="px-4 py-3 font-medium">{c.fullName}</td>
                <td className="px-4 py-3">{c.phone || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/clients/${c.id}`} className="text-primary-600 hover:underline">Voir</Link>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Aucun client</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
