import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [historique, setHistorique] = useState(null);

  useEffect(() => {
    api.get(`/clients/${id}`).then(r => setClient(r.data)).catch(() => {});
    api.get(`/clients/${id}/historique`).then(r => setHistorique(r.data)).catch(() => {});
  }, [id]);

  if (!client) return <div className="text-gray-500">Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{client.fullName}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Informations</h2>
          <dl className="space-y-3">
            <div><dt className="text-sm text-gray-500">Code</dt><dd className="font-medium">{client.code}</dd></div>
            <div><dt className="text-sm text-gray-500">Téléphone</dt><dd className="font-medium">{client.phone || '-'}</dd></div>
            <div><dt className="text-sm text-gray-500">Email</dt><dd className="font-medium">{client.email || '-'}</dd></div>
          </dl>
        </div>
        {historique && (
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Historique</h2>
            <p className="text-sm text-gray-500">BLs: {historique.bls?.length || 0}</p>
            <p className="text-sm text-gray-500">Factures: {historique.factures?.length || 0}</p>
          </div>
        )}
      </div>
    </div>
  );
}
