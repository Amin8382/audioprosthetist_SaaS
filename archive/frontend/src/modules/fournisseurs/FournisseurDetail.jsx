import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

export default function FournisseurDetail() {
  const { id } = useParams();
  const [fournisseur, setFournisseur] = useState(null);
  const [bcs, setBcs] = useState([]);

  useEffect(() => {
    api.get(`/fournisseurs/${id}`).then(r => setFournisseur(r.data)).catch(() => {});
    api.get('/bons-commande').then(r => setBcs((r.data || []).filter(bc => bc.fournisseur?.id === id))).catch(() => {});
  }, [id]);

  if (!fournisseur) return <div className="text-gray-500">Chargement...</div>;

  const badge = (s) => {
    const c = { DRAFT: 'bg-gray-100', ENVOYE: 'bg-blue-100 text-blue-700', RECU: 'bg-green-100 text-green-700', ANNULE: 'bg-red-100 text-red-700', LIVRE: 'bg-green-100 text-green-700' };
    return <span className={`px-2 py-1 text-xs rounded-full ${c[s] || 'bg-gray-100'}`}>{s}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{fournisseur.name}</h1>
        <Link to={`/fournisseurs/${id}/edit`} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Modifier</Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Informations</h2>
          <dl className="space-y-3">
            <div><dt className="text-sm text-gray-500">Code</dt><dd className="font-medium">{fournisseur.code || '-'}</dd></div>
            <div><dt className="text-sm text-gray-500">Contact</dt><dd className="font-medium">{fournisseur.contactName || '-'}</dd></div>
            <div><dt className="text-sm text-gray-500">Téléphone</dt><dd className="font-medium">{fournisseur.phone || '-'}</dd></div>
            <div><dt className="text-sm text-gray-500">Email</dt><dd className="font-medium">{fournisseur.email || '-'}</dd></div>
            <div><dt className="text-sm text-gray-500">Adresse</dt><dd className="font-medium">{fournisseur.address || '-'}</dd></div>
            <div><dt className="text-sm text-gray-500">Site web</dt><dd className="font-medium">{fournisseur.website || '-'}</dd></div>
            <div><dt className="text-sm text-gray-500">Notes</dt><dd className="font-medium whitespace-pre-wrap">{fournisseur.notes || '-'}</dd></div>
          </dl>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Bons de Commande récents</h2>
          {bcs.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun bon de commande</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left">
                <th className="pb-2">N°</th><th className="pb-2">Date</th><th className="pb-2">Total</th><th className="pb-2">Statut</th>
              </tr></thead>
              <tbody>
                {bcs.slice(0, 10).map(bc => (
                  <tr key={bc.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-mono">{bc.numero}</td>
                    <td className="py-2">{bc.dateCommande}</td>
                    <td className="py-2">{bc.totalHt} TND</td>
                    <td className="py-2">{badge(bc.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link to="/bons-commande" className="text-sm text-primary-600 hover:underline mt-3 inline-block">Voir tous les BC &rarr;</Link>
        </div>
      </div>
    </div>
  );
}
