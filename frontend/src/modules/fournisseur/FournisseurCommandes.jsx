import { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function FournisseurCommandes() {
  const [commandes, setCommandes] = useState([]);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    api.get('/marketplace/commandes').then(r => setCommandes(r.data || [])).catch(() => {});
  }, []);

  const handleLivrer = async (id) => {
    await api.put(`/marketplace/commandes/${id}/livrer`);
    setCommandes(commandes.map(c => c.id === id ? { ...c, status: 'LIVRE' } : c));
  };

  const voirLignes = async (id) => {
    const lignes = await api.get(`/marketplace/commandes/${id}/lignes`);
    setDetails(lignes.data || []);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Commandes reçues</h1>

      {details && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Détails de la commande</h3>
            <button onClick={() => setDetails(null)} className="text-sm text-primary-600 hover:underline">Fermer</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left px-4 py-2">Produit</th><th className="text-left px-4 py-2">Qté</th><th className="text-left px-4 py-2">Prix unitaire</th><th className="text-left px-4 py-2">Total</th></tr></thead>
            <tbody>
              {details.map(l => (
                <tr key={l.id} className="border-b">
                  <td className="px-4 py-2">{l.description}</td>
                  <td className="px-4 py-2">{l.quantity}</td>
                  <td className="px-4 py-2">{l.unitPriceHt} TND</td>
                  <td className="px-4 py-2">{(l.unitPriceHt * l.quantity).toFixed(2)} TND</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3">N° BC</th>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Total HT</th>
            <th className="text-left px-4 py-3">Statut</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {commandes.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{c.numero}</td>
                <td className="px-4 py-3">{c.dateCommande}</td>
                <td className="px-4 py-3">{c.totalHt} TND</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => voirLignes(c.id)}
                    className="text-sm text-primary-600 hover:underline">Détail</button>
                  {c.status === 'ENVOYE' && (
                    <button onClick={() => handleLivrer(c.id)}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">
                      Marquer livré
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {commandes.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Aucune commande</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
