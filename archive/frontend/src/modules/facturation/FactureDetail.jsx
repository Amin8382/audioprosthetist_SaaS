import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import PaiementModal from '../../components/PaiementModal';
import PrintButton from '../../components/PrintButton';
import { Printer } from 'lucide-react';

export default function FactureDetail() {
  const { id } = useParams();
  const [facture, setFacture] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [totalTtc, setTotalTtc] = useState(0);
  const [notes, setNotes] = useState('');
  const [showPaiement, setShowPaiement] = useState(false);

  const load = () => {
    api.get(`/factures/${id}`).then(r => { setFacture(r.data); setTotalTtc(r.data.totalTtc); setNotes(r.data.notes || ''); }).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  const handleEdit = async () => {
    await api.put(`/factures/${id}`, { totalTtc, notes });
    setEditMode(false);
  };

  const handleAnnuler = async () => {
    if (confirm('Annuler cette facture ?')) {
      await api.put(`/factures/${id}/annuler`);
      load();
    }
  };

  if (!facture) return <div className="text-gray-500">Chargement...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{facture.numero}</h1>
          <p className="text-gray-500">Client: {facture.client?.fullName} | Date: {facture.dateFacture} | Statut: {facture.status}</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton endpoint={`/factures/${id}/print`} label={<><Printer size={16} /> Imprimer</>} />
          <Link to="/factures" className="text-sm text-gray-600 hover:underline">Retour</Link>
        </div>
      </div>

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
            <button onClick={() => setShowPaiement(true)} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Ajouter un paiement
            </button>
          )}
          {facture.status !== 'ANNULEE' && (
            <button onClick={handleAnnuler} className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Annuler la facture</button>
          )}
        </div>
      </div>

      {showPaiement && <PaiementModal factureId={id} onClose={() => setShowPaiement(false)} onSaved={load} />}
    </div>
  );
}
