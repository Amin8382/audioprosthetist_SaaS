import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function VenteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bl, setBl] = useState(null);
  const [lignes, setLignes] = useState([]);

  useEffect(() => {
    api.get(`/bls/${id}`).then(r => setBl(r.data)).catch(() => {});
  }, [id]);

  const handleConfirm = async () => {
    if (confirm('Confirmer ce BL ?')) {
      await api.post(`/bls/${id}/confirm`);
      navigate('/ventes');
    }
  };

  if (!bl) return <div className="text-gray-500">Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{bl.numero}</h1>
      <p className="text-gray-500 mb-6">Client: {bl.client?.fullName} | Date: {bl.dateBl} | Statut: {bl.status}</p>
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <p className="font-semibold">Total HT: {bl.totalHt} TND | Total TTC: {bl.totalTtc} TND</p>
        {bl.status === 'DRAFT' && (
          <button onClick={handleConfirm} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Confirmer le BL</button>
        )}
      </div>
    </div>
  );
}
