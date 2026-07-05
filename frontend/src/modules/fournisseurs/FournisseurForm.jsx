import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function FournisseurForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' });
  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/fournisseurs', form);
    navigate('/fournisseurs');
  };
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nouveau fournisseur</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Nom *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Contact</label><input value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Téléphone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Email</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
        </div>
        <div><label className="text-sm font-medium">Adresse</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
        <div className="flex gap-3">
          <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg">Enregistrer</button>
          <button type="button" onClick={() => navigate('/fournisseurs')} className="px-6 py-2 border rounded-lg">Annuler</button>
        </div>
      </form>
    </div>
  );
}
