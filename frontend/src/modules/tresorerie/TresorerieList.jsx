import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function TresorerieList() {
  const [mouvements, setMouvements] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const params = {};
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;
    api.get('/tresorerie', { params }).then(r => setMouvements(r.data || [])).catch(() => {});
  }, [startDate, endDate]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trésorerie</h1>
        <div className="flex gap-2">
          <Link to="/tresorerie/bilan" className="px-4 py-2 border rounded-lg hover:bg-gray-50">Bilan</Link>
          <Link to="/tresorerie/bordereau" className="px-4 py-2 border rounded-lg hover:bg-gray-50">Bordereau</Link>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
          <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Type</th>
          <th className="text-left px-4 py-3">Catégorie</th><th className="text-left px-4 py-3">Montant</th>
          <th className="text-left px-4 py-3">Mode</th><th className="text-left px-4 py-3">Description</th>
        </tr></thead><tbody>
          {mouvements.map(m => (
            <tr key={m.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">{m.dateMouvement}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${m.type === 'RECETTE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.type}</span></td>
              <td className="px-4 py-3">{m.categorie?.replace(/_/g, ' ')}</td>
              <td className={`px-4 py-3 font-semibold ${m.type === 'RECETTE' ? 'text-green-600' : 'text-red-600'}`}>{m.montant} TND</td>
              <td className="px-4 py-3">{m.modePaiement}</td>
              <td className="px-4 py-3 text-gray-500">{m.description}</td>
            </tr>
          ))}
          {mouvements.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucun mouvement</td></tr>}
        </tbody></table>
      </div>
    </div>
  );
}
