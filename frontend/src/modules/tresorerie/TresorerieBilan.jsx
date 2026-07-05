import { useState } from 'react';
import api from '../../services/api';

export default function TresorerieBilan() {
  const [bilan, setBilan] = useState(null);
  const [range, setRange] = useState({ start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });

  const load = async () => {
    const r = await api.get('/tresorerie/bilan', { params: range });
    setBilan(r.data);
  };

  useState(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bilan Trésorerie</h1>
      <div className="flex gap-4 mb-6">
        <input type="date" value={range.start} onChange={e => setRange({...range, start: e.target.value})} className="px-3 py-2 border rounded-lg" />
        <input type="date" value={range.end} onChange={e => setRange({...range, end: e.target.value})} className="px-3 py-2 border rounded-lg" />
        <button onClick={load} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Calculer</button>
      </div>
      {bilan && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border"><p className="text-sm text-gray-500">Total Recettes</p><p className="text-2xl font-bold text-green-600">{bilan.recettes} TND</p></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border"><p className="text-sm text-gray-500">Total Dépenses</p><p className="text-2xl font-bold text-red-600">{bilan.depenses} TND</p></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border"><p className="text-sm text-gray-500">Solde</p><p className={`text-2xl font-bold ${bilan.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>{bilan.solde} TND</p></div>
        </div>
      )}
    </div>
  );
}
