import { useState } from 'react';
import api from '../../services/api';

export default function TresorerieBordereau() {
  const [mouvements, setMouvements] = useState([]);
  const [range, setRange] = useState({ start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });

  const load = async () => {
    const r = await api.get('/tresorerie/bordereau', { params: range });
    setMouvements(r.data || []);
  };

  useState(() => { load(); }, []);

  const totalRecettes = mouvements.filter(m => m.type === 'RECETTE').reduce((s, m) => s + Number(m.montant), 0);
  const totalDepenses = mouvements.filter(m => m.type === 'DEPENSE').reduce((s, m) => s + Number(m.montant), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bordereau Trésorerie</h1>
      <div className="flex gap-4 mb-6">
        <input type="date" value={range.start} onChange={e => setRange({...range, start: e.target.value})} className="px-3 py-2 border rounded-lg" />
        <input type="date" value={range.end} onChange={e => setRange({...range, end: e.target.value})} className="px-3 py-2 border rounded-lg" />
        <button onClick={load} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Actualiser</button>
        <button onClick={() => window.print()} className="px-4 py-2 border rounded-lg">Imprimer</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border p-6" id="bordereau-print">
        <table className="w-full text-sm"><thead><tr className="border-b">
          <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Type</th>
          <th className="text-left px-4 py-3">Catégorie</th><th className="text-left px-4 py-3">Montant</th><th className="text-left px-4 py-3">Description</th>
        </tr></thead><tbody>
          {mouvements.map(m => (
            <tr key={m.id} className="border-b">
              <td className="px-4 py-3">{m.dateMouvement}</td>
              <td className="px-4 py-3">{m.type}</td>
              <td className="px-4 py-3">{m.categorie?.replace(/_/g, ' ')}</td>
              <td className={`px-4 py-3 font-medium ${m.type === 'RECETTE' ? 'text-green-600' : 'text-red-600'}`}>{m.montant} TND</td>
              <td className="px-4 py-3">{m.description}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-bold"><td colSpan={3} className="px-4 py-3 text-right">Total Recettes</td><td className="px-4 py-3 text-green-600">{totalRecettes} TND</td><td></td></tr>
          <tr className="font-bold"><td colSpan={3} className="px-4 py-3 text-right">Total Dépenses</td><td className="px-4 py-3 text-red-600">{totalDepenses} TND</td><td></td></tr>
          <tr className="font-bold border-t-2"><td colSpan={3} className="px-4 py-3 text-right">Solde</td><td className={`px-4 py-3 ${totalRecettes - totalDepenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalRecettes - totalDepenses} TND</td><td></td></tr>
        </tfoot></table>
      </div>
    </div>
  );
}
