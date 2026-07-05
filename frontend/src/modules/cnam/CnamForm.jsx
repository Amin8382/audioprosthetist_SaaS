import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function CnamForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [factures, setFactures] = useState([]);
  const [clientId, setClientId] = useState('');
  const [factureId, setFactureId] = useState('');

  useEffect(() => {
    api.get('/clients?size=100').then(r => setClients(r.data.content || [])).catch(() => {});
    api.get('/factures').then(r => setFactures((r.data.content || []).filter(f => f.status === 'PAYEE' || f.status === 'EMISE' || f.status === 'PARTIELLEMENT_PAYEE'))).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    try {
      await api.post('/cnam', { clientId, factureId });
      navigate('/cnam');
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nouvelle demande CNAM</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border max-w-lg space-y-4">
        <div><label className="text-sm font-medium">Client</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
            <option value="">Sélectionner...</option>
            {clients.filter(c => c.cnamNumber).map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.cnamNumber})</option>)}
          </select></div>
        <div><label className="text-sm font-medium">Facture</label>
          <select value={factureId} onChange={e => setFactureId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
            <option value="">Sélectionner...</option>
            {factures.filter(f => !clientId || f.client?.id === clientId).map(f => <option key={f.id} value={f.id}>{f.numero} - {f.totalTtc} TND</option>)}
          </select></div>
        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={!clientId || !factureId} className="px-6 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50">Créer la demande</button>
          <button onClick={() => navigate('/cnam')} className="px-6 py-2 border rounded-lg">Annuler</button>
        </div>
      </div>
    </div>
  );
}
