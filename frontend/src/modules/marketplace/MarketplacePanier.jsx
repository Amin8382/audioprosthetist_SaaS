import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Trash2, ArrowLeft, ShoppingBag, ShoppingCart } from 'lucide-react';

export default function MarketplacePanier() {
  const navigate = useNavigate();
  const [panier, setPanier] = useState(() => JSON.parse(sessionStorage.getItem('panier') || '{}'));
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/fournisseurs').then(r => setFournisseurs(r.data || [])).catch(() => {});
  }, []);

  const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.name]));

  const updateQty = (fId, produitId, delta) => {
    setPanier(prev => {
      const items = [...(prev[fId] || [])];
      const idx = items.findIndex(i => i.produitId === produitId);
      if (idx < 0) return prev;
      const newQty = items[idx].quantity + delta;
      if (newQty <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx] = { ...items[idx], quantity: newQty };
      }
      const updated = { ...prev };
      if (items.length === 0) {
        delete updated[fId];
      } else {
        updated[fId] = items;
      }
      sessionStorage.setItem('panier', JSON.stringify(updated));
      return updated;
    });
  };

  const total = Object.values(panier).reduce((sum, items) => {
    return sum + items.reduce((s, i) => s + i.prixUnitaireHt * i.quantity, 0);
  }, 0);

  const handleCommander = async () => {
    setLoading(true);
    try {
      const body = {};
      for (const [fId, items] of Object.entries(panier)) {
        body[fId] = items.map(i => ({ produitId: i.produitId, quantity: i.quantity }));
      }
      await api.post('/marketplace/commander', body);
      sessionStorage.removeItem('panier');
      setPanier({});
      setSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-16">
        <ShoppingBag size={64} className="mx-auto text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Commande passée avec succès!</h1>
        <p className="text-gray-500 mb-6">Les bons de commande ont été créés. Vous pouvez suivre leur statut.</p>
        <button onClick={() => navigate('/marketplace')}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          Retour au catalogue
        </button>
      </div>
    );
  }

  const entries = Object.entries(panier);
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Panier vide</h1>
        <p className="text-gray-500 mb-6">Ajoutez des produits depuis le catalogue.</p>
        <button onClick={() => navigate('/marketplace')}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          Voir le catalogue
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/marketplace')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Panier</h1>
      </div>

      {entries.map(([fId, items]) => (
        <div key={fId} className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <h3 className="font-semibold text-lg mb-3">{fournisseurMap[fId] || 'Fournisseur'}</h3>
          {items.map((item, i) => (
            <div key={item.produitId} className="flex items-center justify-between py-3 border-t">
              <div className="flex-1">
                <p className="font-medium">{item.nomProduit}</p>
                <p className="text-sm text-gray-500">{item.prixUnitaireHt} TND / unité</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => updateQty(fId, item.produitId, -1)}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100">-</button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button onClick={() => updateQty(fId, item.produitId, 1)}
                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100">+</button>
                <span className="w-24 text-right font-semibold">{(item.prixUnitaireHt * item.quantity).toFixed(2)} TND</span>
                <button onClick={() => updateQty(fId, item.produitId, -item.quantity)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold">Total HT</span>
          <span className="text-2xl font-bold">{total.toFixed(2)} TND</span>
        </div>
        <button onClick={handleCommander} disabled={loading}
          className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Traitement...' : 'Passer la commande'}
        </button>
      </div>
    </div>
  );
}
