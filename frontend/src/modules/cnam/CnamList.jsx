import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus } from 'lucide-react';

export default function CnamList() {
  const [demandes, setDemandes] = useState([]);
  useEffect(() => { api.get('/cnam').then(r => setDemandes(r.data || [])).catch(() => {}); }, []);

  const badge = (s) => {
    const c = { DRAFT: 'bg-gray-100', SOUMISE: 'bg-blue-100 text-blue-700', EN_COURS: 'bg-yellow-100 text-yellow-700', APPROUVEE: 'bg-green-100 text-green-700', REJETEE: 'bg-red-100 text-red-700', PAYEE: 'bg-green-100 text-green-700' };
    return <span className={`px-2 py-1 text-xs rounded-full ${c[s] || 'bg-gray-100'}`}>{s?.replace(/_/g, ' ')}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Demandes CNAM</h1>
        <Link to="/cnam/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus size={18} /> Nouvelle demande
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
          <th className="text-left px-4 py-3">N°</th><th className="text-left px-4 py-3">Client</th>
          <th className="text-left px-4 py-3">Montant</th><th className="text-left px-4 py-3">Probabilité</th>
          <th className="text-left px-4 py-3">Statut</th><th></th>
        </tr></thead><tbody>
          {demandes.map(d => (
            <tr key={d.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-sm">{d.numero}</td>
              <td className="px-4 py-3">{d.client?.fullName}</td>
              <td className="px-4 py-3">{d.montantDemande} TND</td>
              <td className="px-4 py-3">{d.successProbability ? `${(d.successProbability * 100).toFixed(0)}%` : '-'}</td>
              <td className="px-4 py-3">{badge(d.status)}</td>
              <td className="px-4 py-3 text-right"><Link to={`/cnam/${d.id}`} className="text-primary-600 hover:underline">Détail</Link></td>
            </tr>
          ))}
          {demandes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucune demande CNAM</td></tr>}
        </tbody></table>
      </div>
    </div>
  );
}
