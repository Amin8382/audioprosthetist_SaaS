import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Users, Upload } from 'lucide-react';

export default function ConfigClinique() {
  const [config, setConfig] = useState({ clinicName: '', address: '', phone: '', email: '', tvaNumber: '', facturePrefix: 'FAC', blPrefix: 'BL', bcPrefix: 'BC' });
  const [logoId, setLogoId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef(null);
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

  useEffect(() => {
    api.get('/config').then(r => { setConfig(r.data || config); }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.put('/config', config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${baseUrl}/config/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setLogoId(data.documentId);
      }
    } catch { alert('Erreur upload logo'); }
    finally { setUploading(false); }
  };

  const logoUrl = logoId ? `${baseUrl}/documents/${logoId}/download` : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Configuration clinique</h1>
        <Link to="/configuration/utilisateurs" className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
          <Users size={18} /> Utilisateurs
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border space-y-4">
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
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Enregistrer</button>
            {saved && <span className="text-sm text-green-600">✓ Enregistré</span>}
          </div>
        </form>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="font-semibold mb-4">Logo clinique</h3>
          <div className="mb-4 flex items-center justify-center h-32 bg-gray-50 rounded-lg border overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-gray-400 text-sm">Aucun logo</span>
            )}
          </div>
          <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
          <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <Upload size={16} /> {uploading ? 'Upload...' : 'Changer le logo'}
          </button>
          <p className="text-xs text-gray-400 mt-2">JPG, PNG, SVG — max 2MB</p>
        </div>
      </div>
    </div>
  );
}
