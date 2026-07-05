import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function StockForm() {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [form, setForm] = useState({ fullName: '', category: 'APPAREIL_AUDITIF', reference: '', unitPriceHt: 0, quantityInStock: 0, quantityMinimum: 0, earSide: '', notes: '' });

  useEffect(() => { api.get('/fournisseurs').then(r => setFournisseurs(r.data || [])).catch(() => {}); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/stocks', form);
    navigate('/stocks');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nouvel article</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Nom *</label><input value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Référence</label><input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Catégorie</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
              <option value="APPAREIL_AUDITIF">Appareil auditif</option><option value="ACCESSOIRE">Accessoire</option>
              <option value="PILE">Pile</option><option value="EMBOUT">Embout</option><option value="AUTRE">Autre</option>
            </select></div>
          <div><label className="text-sm font-medium">Prix HT</label><input type="number" value={form.unitPriceHt} onChange={e => setForm({...form, unitPriceHt: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Qté initiale</label><input type="number" value={form.quantityInStock} onChange={e => setForm({...form, quantityInStock: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Qté minimum</label><input type="number" value={form.quantityMinimum} onChange={e => setForm({...form, quantityMinimum: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" /></div>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg">Enregistrer</button>
          <button type="button" onClick={() => navigate('/stocks')} className="px-6 py-2 border rounded-lg">Annuler</button>
        </div>
      </form>
    </div>
  );
}
