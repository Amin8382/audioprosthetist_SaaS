import { useState } from 'react';
import api from '../services/api';

export default function PaiementModal({ factureId, onClose, onSaved }) {
  const [paiement, setPaiement] = useState({
    montant: '',
    modePaiement: 'ESPECES',
    reference: '',
    datePaiement: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/factures/${factureId}/paiement`, paiement);
      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch {
      alert('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white p-6 rounded-xl max-w-md w-full m-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Ajouter un paiement</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">Montant (TND)</label>
            <input type="number" step="0.01" required value={paiement.montant}
              onChange={e => setPaiement({...paiement, montant: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Mode de paiement</label>
            <select value={paiement.modePaiement}
              onChange={e => setPaiement({...paiement, modePaiement: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="ESPECES">Espèces</option>
              <option value="VIREMENT">Virement</option>
              <option value="CHEQUE">Chèque</option>
              <option value="CARTE">Carte bancaire</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Référence</label>
            <input value={paiement.reference}
              onChange={e => setPaiement({...paiement, reference: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Date</label>
            <input type="date" value={paiement.datePaiement}
              onChange={e => setPaiement({...paiement, datePaiement: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}
