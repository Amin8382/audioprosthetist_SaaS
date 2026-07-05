import { useState } from 'react';
import api from '../../services/api';

export default function ReparationsList() {
  const [tickets, setTickets] = useState([]);
  useState(() => { api.get('/reparations').then(r => setTickets(r.data || [])).catch(() => {}); }, []);

  const updateStatus = async (id, status) => {
    await api.put(`/reparations/${id}/status`, { status });
    window.location.reload();
  };

  const statusColors = {
    OUVERT: 'bg-yellow-100 text-yellow-700',
    ENVOYE_FOURNISSEUR: 'bg-blue-100 text-blue-700',
    EN_REPARATION: 'bg-purple-100 text-purple-700',
    RETOURNE: 'bg-green-100 text-green-700',
    CLOS: 'bg-gray-100 text-gray-600',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tickets Réparation</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
          <th className="text-left px-4 py-3">N°</th><th className="text-left px-4 py-3">Client</th>
          <th className="text-left px-4 py-3">Fournisseur</th><th className="text-left px-4 py-3">Statut</th><th></th>
        </tr></thead><tbody>
          {tickets.map(t => (
            <tr key={t.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-sm">{t.numero}</td>
              <td className="px-4 py-3">{t.client?.fullName}</td>
              <td className="px-4 py-3">{t.fournisseur?.name}</td>
              <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${statusColors[t.status] || 'bg-gray-100'}`}>{t.status?.replace(/_/g, ' ')}</span></td>
              <td className="px-4 py-3">
                {t.status === 'OUVERT' && <button onClick={() => updateStatus(t.id, 'ENVOYE_FOURNISSEUR')} className="text-xs text-blue-600 hover:underline">Envoyer</button>}
                {t.status === 'ENVOYE_FOURNISSEUR' && <button onClick={() => updateStatus(t.id, 'EN_REPARATION')} className="text-xs text-purple-600 hover:underline">En réparation</button>}
                {t.status === 'EN_REPARATION' && <button onClick={() => updateStatus(t.id, 'RETOURNE')} className="text-xs text-green-600 hover:underline">Retourné</button>}
                {t.status === 'RETOURNE' && <button onClick={() => updateStatus(t.id, 'CLOS')} className="text-xs text-gray-600 hover:underline">Clôturer</button>}
              </td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}
