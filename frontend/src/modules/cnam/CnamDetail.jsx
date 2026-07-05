import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function CnamDetail() {
  const { id } = useParams();
  const [demande, setDemande] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    api.get(`/cnam/${id}`).then(r => setDemande(r.data)).catch(() => {});
  }, [id]);

  const handleSoumettre = async () => {
    try {
      await api.post(`/cnam/${id}/soumettre`);
      window.location.reload();
    } catch (err) { alert(err.response?.data?.message || 'Erreur'); }
  };

  if (!demande) return <div className="text-gray-500">Chargement...</div>;

  const requiredDocs = ['ORDONNANCE', 'AUDIOGRAMME', 'FACTURE', 'CARTE_NATIONALE', 'CARTE_CNAM'];
  const uploadedTypes = documents.filter(d => d.uploaded).map(d => d.documentType);
  const allUploaded = requiredDocs.every(d => uploadedTypes.includes(d));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{demande.numero}</h1>
      <p className="text-gray-500 mb-6">Client: {demande.client?.fullName} | Statut: {demande.status}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Détails</h2>
          <dl className="space-y-3">
            <div><dt className="text-sm text-gray-500">Montant demandé</dt><dd className="font-medium">{demande.montantDemande} TND</dd></div>
            <div><dt className="text-sm text-gray-500">Montant approuvé</dt><dd className="font-medium">{demande.montantApprouve || '-'} TND</dd></div>
            {demande.successProbability && (
              <div>
                <dt className="text-sm text-gray-500">Probabilité de succès</dt>
                <dd className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full" style={{ width: `${demande.successProbability * 100}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{(demande.successProbability * 100).toFixed(0)}%</span>
                </dd>
              </div>
            )}
            {demande.motifRejet && <div><dt className="text-sm text-red-500">Motif de rejet</dt><dd>{demande.motifRejet}</dd></div>}
          </dl>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Documents requis</h2>
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg ${doc.uploaded ? 'bg-green-50' : 'bg-gray-50'}`}>
                <span className="text-sm">{doc.documentType?.replace(/_/g, ' ')}</span>
                {doc.uploaded ? <span className="text-xs text-green-600">✓ Uploadé</span> : <span className="text-xs text-red-500">Manquant</span>}
              </div>
            ))}
            {documents.length === 0 && requiredDocs.map(doc => (
              <div key={doc} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span className="text-sm">{doc.replace(/_/g, ' ')}</span>
                <span className="text-xs text-red-500">Manquant</span>
              </div>
            ))}
          </div>
          {demande.status === 'DRAFT' && (
            <button onClick={handleSoumettre} disabled={!allUploaded}
              className="mt-4 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {allUploaded ? 'Soumettre la demande' : 'Documents requis manquants'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
