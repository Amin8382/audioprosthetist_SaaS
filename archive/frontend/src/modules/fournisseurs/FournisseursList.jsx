import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus } from 'lucide-react';

export default function FournisseursList() {
  const [fournisseurs, setFournisseurs] = useState([]);
  useEffect(() => {
    api.get('/fournisseurs').then(r => setFournisseurs(r.data || [])).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fournisseurs</h1>
        <Link to="/fournisseurs/new" className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus size={18} /> Nouveau fournisseur
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3">Code</th><th className="text-left px-4 py-3">Nom</th>
            <th className="text-left px-4 py-3">Contact</th><th className="text-left px-4 py-3">Téléphone</th><th></th>
          </tr></thead>
          <tbody>
            {fournisseurs.map(f => (
              <tr key={f.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{f.code}</td>
                <td className="px-4 py-3 font-medium">{f.name}</td>
                <td className="px-4 py-3">{f.contactName || '-'}</td>
                <td className="px-4 py-3">{f.phone || '-'}</td>
                <td className="px-4 py-3 text-right"><Link to={`/fournisseurs/${f.id}`} className="text-primary-600 hover:underline">Voir</Link></td>
              </tr>
            ))}
            {fournisseurs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Aucun fournisseur</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
