import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ClientForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', address: '', nationalId: '', dateOfBirth: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/clients', form);
      navigate('/clients');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nouveau client</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Nom complet *</label>
            <input value={form.fullName} onChange={e => update('fullName', e.target.value)} required className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Téléphone</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Email</label>
            <input value={form.email} onChange={e => update('email', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Date naissance</label>
            <input type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">N° Carte nationale</label>
            <input value={form.nationalId} onChange={e => update('nationalId', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Adresse</label>
          <textarea value={form.address} onChange={e => update('address', e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={2} /></div>
        <div><label className="block text-sm font-medium mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={2} /></div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button type="button" onClick={() => navigate('/clients')} className="px-6 py-2 border rounded-lg hover:bg-gray-50">Annuler</button>
        </div>
      </form>
    </div>
  );
}
