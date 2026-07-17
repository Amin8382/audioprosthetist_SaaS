import { useState, useEffect } from 'react';
import api from '../../services/api';
import PrintButton from '../../components/PrintButton';
import { Printer } from 'lucide-react';

export default function BonsCommandeList() {
  const [bcs, setBcs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [form, setForm] = useState({ fournisseurId: '', notes: '', lignes: [{ description: '', quantity: 1, unitPriceHt: 0 }] });

  useEffect(() => {
    api.get('/bons-commande').then(r => setBcs(r.data || [])).catch(() => {});
    api.get('/fournisseurs').then(r => setFournisseurs(r.data || [])).catch(() => {});
  }, []);

  const handleRecevoir = async (id) => {
    await api.put(`/bons-commande/${id}/recevoir`);
    window.location.reload();
  };

  const handleSubmit = async () => {
    await api.post('/bons-commande', form);
    setShowForm(false);
    window.location.reload();
  };

  const badge = (s) => {
    const c = { DRAFT: 'bg-gray-100', ENVOYE: 'bg-blue-100 text-blue-700', RECU: 'bg-green-100 text-green-700', ANNULE: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-1 text-xs rounded-full ${c[s]}`}>{s}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bons de Commande</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Nouveau BC</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
          <th className="text-left px-4 py-3">N°</th><th className="text-left px-4 py-3">Fournisseur</th>
          <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Total</th>
          <th className="text-left px-4 py-3">Statut</th><th></th>
        </tr></thead><tbody>
          {bcs.map(bc => (
            <tr key={bc.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-sm">{bc.numero}</td>
              <td className="px-4 py-3">{bc.fournisseur?.name}</td>
              <td className="px-4 py-3">{bc.dateCommande}</td>
              <td className="px-4 py-3">{bc.totalHt} TND</td>
              <td className="px-4 py-3">{badge(bc.status)}</td>
              <td className="px-4 py-3 flex items-center gap-2">
                <PrintButton endpoint={`/bons-commande/${bc.id}/print`} label={<Printer size={16} />} className="!p-1.5" />
                {bc.status === 'ENVOYE' && <button onClick={() => handleRecevoir(bc.id)} className="text-xs text-green-600 hover:underline">Recevoir</button>}
              </td>
            </tr>
          ))}
          {bcs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucun BC</td></tr>}
        </tbody></table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-xl max-w-lg w-full m-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Nouveau Bon de Commande</h2>
            <div className="space-y-3">
              <select value={form.fournisseurId} onChange={e => setForm({...form, fournisseurId: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Fournisseur...</option>
                {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {form.lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input placeholder="Description" value={l.description} onChange={e => { const lignes = [...form.lignes]; lignes[i].description = e.target.value; setForm({...form, lignes}); }} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="number" placeholder="Qté" value={l.quantity} onChange={e => { const lignes = [...form.lignes]; lignes[i].quantity = Number(e.target.value); setForm({...form, lignes}); }} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="number" placeholder="Prix HT" value={l.unitPriceHt} onChange={e => { const lignes = [...form.lignes]; lignes[i].unitPriceHt = Number(e.target.value); setForm({...form, lignes}); }} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={handleSubmit} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Créer</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
