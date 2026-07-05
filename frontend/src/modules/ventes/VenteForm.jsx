import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Trash2 } from 'lucide-react';

export default function VenteForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [type, setType] = useState('CONSULTATION');
  const [clientId, setClientId] = useState('');
  const [lignes, setLignes] = useState([{ description: '', quantity: 1, unitPriceHt: 0, earSide: '' }]);

  useEffect(() => {
    api.get('/clients?size=100').then(r => setClients(r.data.content || [])).catch(() => {});
    api.get('/stocks').then(r => setStockItems(r.data || [])).catch(() => {});
  }, []);

  const addLigne = () => setLignes([...lignes, { description: '', quantity: 1, unitPriceHt: 0, earSide: '' }]);
  const removeLigne = (i) => setLignes(lignes.filter((_, idx) => idx !== i));
  const updateLigne = (i, field, value) => {
    const updated = [...lignes];
    updated[i][field] = value;
    setLignes(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bls', { type, clientId, lignes, tvaRate: 19 });
      navigate('/ventes');
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nouveau Bon de Livraison</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border max-w-4xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Client *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} required className="w-full px-3 py-2 border rounded-lg">
              <option value="">Sélectionner...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.code})</option>)}
            </select></div>
          <div><label className="block text-sm font-medium mb-1">Type *</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
              <option value="CONSULTATION">Consultation</option><option value="APPAREIL">Appareil</option>
              <option value="ACCESSOIRE">Accessoire</option><option value="AUTRE">Autre</option>
            </select></div>
        </div>

        <h3 className="font-semibold mt-4">Lignes</h3>
        {lignes.map((ligne, i) => (
          <div key={i} className="grid grid-cols-5 gap-3 items-end p-3 bg-gray-50 rounded-lg">
            <div className="col-span-2"><label className="text-xs text-gray-500">Description</label>
              <input value={ligne.description} onChange={e => updateLigne(i, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-xs text-gray-500">Qté</label>
              <input type="number" value={ligne.quantity} onChange={e => updateLigne(i, 'quantity', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-xs text-gray-500">Prix unitaire HT</label>
              <input type="number" value={ligne.unitPriceHt} onChange={e => updateLigne(i, 'unitPriceHt', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <button type="button" onClick={() => removeLigne(i)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" onClick={addLigne} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800">
          <Plus size={16} /> Ajouter une ligne
        </button>

        <div className="flex gap-3 pt-4">
          <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Enregistrer</button>
          <button type="button" onClick={() => navigate('/ventes')} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
        </div>
      </form>
    </div>
  );
}
