import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function StockDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [mouvements, setMouvements] = useState([]);

  useEffect(() => {
    api.get(`/stocks/${id}`).then(r => setItem(r.data)).catch(() => {});
    api.get(`/stocks/${id}/mouvements`).then(r => setMouvements(r.data || [])).catch(() => {});
  }, [id]);

  if (!item) return <div className="text-gray-500">Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{item.fullName}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Détails</h2>
          <dl className="space-y-3">
            <div><dt className="text-sm text-gray-500">Référence</dt><dd>{item.reference}</dd></div>
            <div><dt className="text-sm text-gray-500">Catégorie</dt><dd>{item.category}</dd></div>
            <div><dt className="text-sm text-gray-500">En stock</dt><dd className={`font-bold ${item.quantityInStock <= item.quantityMinimum ? 'text-red-600' : ''}`}>{item.quantityInStock}</dd></div>
            <div><dt className="text-sm text-gray-500">Minimum</dt><dd>{item.quantityMinimum}</dd></div>
            <div><dt className="text-sm text-gray-500">Prix HT</dt><dd>{item.unitPriceHt} TND</dd></div>
          </dl>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Mouvements</h2>
          {mouvements.length === 0 ? <p className="text-gray-500">Aucun mouvement</p> : (
            <div className="space-y-2">
              {mouvements.map(m => (
                <div key={m.id} className="flex justify-between text-sm border-b pb-2">
                  <span className={m.type === 'ENTREE' ? 'text-green-600' : 'text-red-600'}>{m.type}</span>
                  <span>{m.quantity} unités</span>
                  <span className="text-gray-500">{m.dateMouvement}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
