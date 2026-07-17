import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PrintButton from '../../components/PrintButton';
import { Plus, Printer } from 'lucide-react';

export default function FacturesList() {
  const [factures, setFactures] = useState([]);
  useEffect(() => {
    api.get('/factures').then(r => setFactures(r.data.content || [])).catch(() => {});
  }, []);

  const badge = (s) => {
    const c = { EMISE: 'bg-blue-100 text-blue-700', PARTIELLEMENT_PAYEE: 'bg-yellow-100 text-yellow-700', PAYEE: 'bg-green-100 text-green-700', ANNULEE: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-1 text-xs rounded-full ${c[s] || 'bg-gray-100'}`}>{s?.replace('_', ' ')}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Factures</h1>
        <Link to="/factures/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus size={18} /> Nouvelle facture
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3">N°</th><th className="text-left px-4 py-3">Client</th>
            <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Total TTC</th>
            <th className="text-left px-4 py-3">Payé</th><th className="text-left px-4 py-3">Reste</th>
            <th className="text-left px-4 py-3">Statut</th><th></th>
          </tr></thead>
          <tbody>
            {factures.map(f => (
              <tr key={f.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{f.numero}</td>
                <td className="px-4 py-3">{f.client?.fullName}</td>
                <td className="px-4 py-3">{f.dateFacture}</td>
                <td className="px-4 py-3">{f.totalTtc} TND</td>
                <td className="px-4 py-3">{f.montantPaye} TND</td>
                <td className="px-4 py-3">{f.resteAPayer} TND</td>
                <td className="px-4 py-3">{badge(f.status)}</td>
                <td className="px-4 py-3 text-right flex items-center gap-2 justify-end">
                  <PrintButton endpoint={`/factures/${f.id}/print`} label={<Printer size={16} />} className="!p-1.5" />
                  <Link to={`/factures/${f.id}`} className="text-primary-600 hover:underline">Détail</Link>
                </td>
              </tr>
            ))}
            {factures.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Aucune facture</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
