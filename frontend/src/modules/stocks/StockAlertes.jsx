import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AlertTriangle } from 'lucide-react';

export default function StockAlertes() {
  const [alertes, setAlertes] = useState([]);
  useEffect(() => { api.get('/stocks/alertes').then(r => setAlertes(r.data || [])).catch(() => {}); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><AlertTriangle className="text-orange-500" /> Alertes Stock</h1>
      <div className="bg-white rounded-xl shadow-sm border">
        {alertes.length === 0 ? (
          <div className="p-6 text-green-600">✓ Aucun article en dessous du seuil minimum</div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3">Article</th><th className="text-left px-4 py-3">En stock</th><th className="text-left px-4 py-3">Minimum</th><th></th>
          </tr></thead><tbody>
            {alertes.map(item => (
              <tr key={item.id} className="border-b bg-red-50">
                <td className="px-4 py-3 font-medium">{item.fullName}</td>
                <td className="px-4 py-3 text-red-600 font-bold">{item.quantityInStock}</td>
                <td className="px-4 py-3">{item.quantityMinimum}</td>
                <td className="px-4 py-3 text-right"><Link to={`/stocks/${item.id}`} className="text-primary-600 hover:underline">Détail</Link></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
