import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus, AlertTriangle } from 'lucide-react';

export default function StocksList() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/stocks').then(r => setItems(r.data || [])).catch(() => {}); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Stock</h1>
          <Link to="/stocks/alertes" className="flex items-center gap-1 text-sm text-orange-600 hover:underline">
            <AlertTriangle size={16} /> Alertes
          </Link>
        </div>
        <Link to="/stocks/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus size={18} /> Nouvel article
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
          <th className="text-left px-4 py-3">Réf</th><th className="text-left px-4 py-3">Nom</th>
          <th className="text-left px-4 py-3">Catégorie</th><th className="text-left px-4 py-3">En stock</th>
          <th className="text-left px-4 py-3">Minimum</th><th className="text-left px-4 py-3">Prix HT</th><th></th>
        </tr></thead><tbody>
          {items.map(item => {
            const lowStock = item.quantityInStock <= item.quantityMinimum;
            return (
              <tr key={item.id} className={`border-b hover:bg-gray-50 ${lowStock ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 text-gray-500">{item.reference}</td>
                <td className="px-4 py-3 font-medium">{item.fullName}</td>
                <td className="px-4 py-3">{item.category}</td>
                <td className={`px-4 py-3 font-semibold ${lowStock ? 'text-red-600' : ''}`}>{item.quantityInStock}</td>
                <td className="px-4 py-3">{item.quantityMinimum}</td>
                <td className="px-4 py-3">{item.unitPriceHt} TND</td>
                <td className="px-4 py-3 text-right"><Link to={`/stocks/${item.id}`} className="text-primary-600 hover:underline">Détail</Link></td>
              </tr>
            );
          })}
          {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Aucun article</td></tr>}
        </tbody></table>
      </div>
    </div>
  );
}
