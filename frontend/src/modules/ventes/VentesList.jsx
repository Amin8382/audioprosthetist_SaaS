import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus } from 'lucide-react';

export default function VentesList() {
  const [bls, setBls] = useState([]);

  useEffect(() => {
    api.get('/bls').then(r => setBls(r.data.content || [])).catch(() => {});
  }, []);

  const statusBadge = (status) => {
    const colors = { DRAFT: 'bg-gray-100 text-gray-600', CONFIRMED: 'bg-green-100 text-green-700', INVOICED: 'bg-blue-100 text-blue-700' };
    return <span className={`px-2 py-1 text-xs rounded-full ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bons de Livraison</h1>
        <Link to="/ventes/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus size={18} /> Nouveau BL
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3">N°</th><th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Total TTC</th><th className="text-left px-4 py-3">Statut</th><th></th>
          </tr></thead>
          <tbody>
            {bls.map(bl => (
              <tr key={bl.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{bl.numero}</td>
                <td className="px-4 py-3">{bl.client?.fullName || '-'}</td>
                <td className="px-4 py-3">{bl.dateBl}</td>
                <td className="px-4 py-3">{bl.type}</td>
                <td className="px-4 py-3">{bl.totalTtc} TND</td>
                <td className="px-4 py-3">{statusBadge(bl.status)}</td>
                <td className="px-4 py-3 text-right"><Link to={`/ventes/${bl.id}`} className="text-primary-600 hover:underline">Détail</Link></td>
              </tr>
            ))}
            {bls.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Aucun BL</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
