import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function FactureDetail() {
  const { id } = useParams();
  const [facture, setFacture] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [totalTtc, setTotalTtc] = useState(0);
  const [notes, setNotes] = useState('');
  const [paiement, setPaiement] = useState({ montant: '', modePaiement: 'ESPECES', reference: '', datePaiement: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    api.get(`/factures/${id}`).then(r => { setFacture(r.data); setTotalTtc(r.data.totalTtc); setNotes(r.data.notes || ''); }).catch(() => {});
  }, [id]);

  const handleEdit = async () => {
    await api.put(`/factures/${id}`, { totalTtc, notes });
    setEditMode(false);
  };

  const handlePaiement = async () => {
    await api.post(`/factures/${id}/paiement`, paiement);
    window.location.reload();
  };

  const handleAnnuler = async () => {
    if (confirm('Annuler cette facture ?')) {
      await api.put(`/factures/${id}/annuler`);
      window.location.reload();
    }
  };

  if (!facture) return <div className="text-gray-500">Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{facture.numero}</h1>
      <p className="text-gray-500 mb-6">Client: {facture.client?.fullName} | Date: {facture.dateFacture} | Statut: {facture.status}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Détails</h2>
            {facture.status !== 'ANNULEE' && (
              <button onClick={() => setEditMode(!editMode)} className="text-sm text-primary-600 hover:underline">
                {editMode ? 'Annuler' : 'Modifier'}
              </button>
            )}
          </div>
          {editMode ? (
            <div className="space-y-3">
              <div><label className="text-sm">Total TTC</label><input type="number" value={totalTtc} onChange={e => setTotalTtc(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="text-sm">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <button onClick={handleEdit} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Enregistrer</button>
            </div>
          ) : (
            <dl className="space-y-3">
              <div><dt className="text-sm text-gray-500">Total HT</dt><dd className="font-medium">{facture.totalHt} TND</dd></div>
              <div><dt className="text-sm text-gray-500">TVA</dt><dd className="font-medium">{facture.montantTva} TND</dd></div>
              <div><dt className="text-sm text-gray-500">Total TTC</dt><dd className="font-medium">{facture.totalTtc} TND</dd></div>
              <div><dt className="text-sm text-gray-500">Payé</dt><dd className="font-medium">{facture.montantPaye} TND</dd></div>
              <div><dt className="text-sm text-gray-500">Reste à payer</dt><dd className="font-medium text-red-600">{facture.resteAPayer} TND</dd></div>
              {facture.notes && <div><dt className="text-sm text-gray-500">Notes</dt><dd className="font-medium">{facture.notes}</dd></div>}
            </dl>
          )}
        </div>

        <div className="space-y-6">
          {facture.status !== 'ANNULEE' && facture.status !== 'PAYEE' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-semibold mb-4">Ajouter un paiement</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm">Montant</label><input type="number" value={paiement.montant} onChange={e => setPaiement({...paiement, montant: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div><label className="text-sm">Mode</label>
                    <select value={paiement.modePaiement} onChange={e => setPaiement({...paiement, modePaiement: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                      <option value="ESPECES">Espèces</option><option value="VIREMENT">Virement</option><option value="BON_ACHAT_CNAM">Bon d'achat CNAM</option>
                    </select></div>
                </div>
                <div><label className="text-sm">Référence</label><input value={paiement.reference} onChange={e => setPaiement({...paiement, reference: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="text-sm">Date</label><input type="date" value={paiement.datePaiement} onChange={e => setPaiement({...paiement, datePaiement: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <button onClick={handlePaiement} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Enregistrer le paiement</button>
              </div>
            </div>
          )}
          {facture.status !== 'ANNULEE' && (
            <button onClick={handleAnnuler} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Annuler la facture</button>
          )}
        </div>
      </div>
    </div>
  );
}
