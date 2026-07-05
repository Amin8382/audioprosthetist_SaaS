import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function FactureForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [bls, setBls] = useState([]);
  const [selectedBls, setSelectedBls] = useState([]);

  useEffect(() => {
    api.get('/clients?size=100').then(r => setClients(r.data.content || [])).catch(() => {});
    api.get('/bls').then(r => setBls((r.data.content || []).filter(b => b.status === 'CONFIRMED'))).catch(() => {});
  }, []);

  const toggleBl = (blId) => {
    setSelectedBls(prev => prev.includes(blId) ? prev.filter(id => id !== blId) : [...prev, blId]);
  };

  const handleSubmit = async () => {
    try {
      await api.post('/factures', { clientId, blIds: selectedBls });
      navigate('/factures');
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nouvelle facture</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border max-w-2xl space-y-4">
        <div><label className="block text-sm font-medium mb-1">Client</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
            <option value="">Sélectionner...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select></div>
        <div><h3 className="font-semibold mb-2">BLs confirmés</h3>
          {bls.filter(b => !clientId || b.client?.id === clientId).map(bl => (
            <label key={bl.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input type="checkbox" checked={selectedBls.includes(bl.id)} onChange={() => toggleBl(bl.id)} />
              <span className="text-sm">{bl.numero} - {bl.client?.fullName} - {bl.totalTtc} TND</span>
            </label>
          ))}
          {bls.length === 0 && <p className="text-sm text-gray-500">Aucun BL confirmé disponible</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={selectedBls.length === 0} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">Créer la facture</button>
          <button onClick={() => navigate('/factures')} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
        </div>
      </div>
    </div>
  );
}
