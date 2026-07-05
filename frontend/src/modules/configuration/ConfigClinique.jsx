import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Users } from 'lucide-react';

export default function ConfigClinique() {
  const [config, setConfig] = useState({ clinicName: '', address: '', phone: '', email: '', tvaNumber: '', facturePrefix: 'FAC', blPrefix: 'BL', bcPrefix: 'BC', cnamPrefix: 'CNAM' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/config').then(r => setConfig(r.data || config)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.put('/config', config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Configuration clinique</h1>
        <Link to="/configuration/utilisateurs" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
          <Users size={18} /> Utilisateurs
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium">Nom de la clinique</label><input value={config.clinicName} onChange={e => setConfig({...config, clinicName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Téléphone</label><input value={config.phone} onChange={e => setConfig({...config, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">Email</label><input value={config.email} onChange={e => setConfig({...config, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm font-medium">N° TVA</label><input value={config.tvaNumber} onChange={e => setConfig({...config, tvaNumber: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
        </div>
        <div><label className="text-sm font-medium">Adresse</label><textarea value={config.address} onChange={e => setConfig({...config, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
        <hr />
        <h3 className="font-semibold">Numérotation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm text-gray-500">Préfixe Factures</label><input value={config.facturePrefix} onChange={e => setConfig({...config, facturePrefix: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm text-gray-500">Préfixe BL</label><input value={config.blPrefix} onChange={e => setConfig({...config, blPrefix: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm text-gray-500">Préfixe BC</label><input value={config.bcPrefix} onChange={e => setConfig({...config, bcPrefix: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="text-sm text-gray-500">Préfixe CNAM</label><input value={config.cnamPrefix} onChange={e => setConfig({...config, cnamPrefix: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Enregistrer</button>
          {saved && <span className="text-sm text-green-600">✓ Enregistré</span>}
        </div>
      </form>
    </div>
  );
}
