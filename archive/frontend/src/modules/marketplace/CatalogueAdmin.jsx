import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2, Trash2, X, Check, Package } from 'lucide-react';

export default function CatalogueAdmin() {
  const [produits, setProduits] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nomProduit: '', referenceFournisseur: '', categorie: 'APPAREIL_AUDITIF', prixUnitaireHt: '', earSide: '', description: '', fournisseurId: '' });

  useEffect(() => {
    api.get('/catalogue').then(r => setProduits(r.data || [])).catch(() => {});
    api.get('/fournisseurs').then(r => setFournisseurs(r.data || [])).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm({ nomProduit: '', referenceFournisseur: '', categorie: 'APPAREIL_AUDITIF', prixUnitaireHt: '', earSide: '', description: '', fournisseurId: '' });
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    try {
      const body = { ...form, prixUnitaireHt: parseFloat(form.prixUnitaireHt), fournisseur: { id: form.fournisseurId } };
      if (editing) {
        await api.put(`/catalogue/${editing}`, body);
      } else {
        await api.post('/catalogue', body);
      }
      resetForm();
      const updated = await api.get('/catalogue');
      setProduits(updated.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    }
  };

  const handleEdit = (p) => {
    setForm({ nomProduit: p.nomProduit, referenceFournisseur: p.referenceFournisseur || '', categorie: p.categorie, prixUnitaireHt: p.prixUnitaireHt, earSide: p.earSide || '', description: p.description || '', fournisseurId: p.fournisseur?.id || '' });
    setEditing(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Supprimer ce produit ?')) {
      await api.delete(`/catalogue/${id}`);
      setProduits(produits.filter(p => p.id !== id));
    }
  };

  const handleToggle = async (p) => {
    await api.put(`/catalogue/${p.id}`, { isAvailable: !p.isAvailable });
    setProduits(produits.map(x => x.id === p.id ? { ...x, isAvailable: !x.isAvailable } : x));
  };

  const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion du catalogue</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus size={18} /> Nouveau produit
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">{editing ? 'Modifier' : 'Nouveau'} produit</h3>
            <button onClick={resetForm}><X size={20} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="text-sm font-medium">Nom du produit *</label>
              <input value={form.nomProduit} onChange={e => setForm({...form, nomProduit: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="text-sm font-medium">Référence fournisseur</label>
              <input value={form.referenceFournisseur} onChange={e => setForm({...form, referenceFournisseur: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="text-sm font-medium">Fournisseur *</label>
              <select value={form.fournisseurId} onChange={e => setForm({...form, fournisseurId: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Sélectionner...</option>
                {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select></div>
            <div><label className="text-sm font-medium">Catégorie</label>
              <select value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="APPAREIL_AUDITIF">Appareil auditif</option>
                <option value="ACCESSOIRE">Accessoire</option>
                <option value="PILE">Pile</option>
                <option value="EMBOUT">Embout</option>
                <option value="AUTRE">Autre</option>
              </select></div>
            <div><label className="text-sm font-medium">Prix unitaire HT *</label>
              <input type="number" value={form.prixUnitaireHt} onChange={e => setForm({...form, prixUnitaireHt: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            <div><label className="text-sm font-medium">Côté</label>
              <select value={form.earSide} onChange={e => setForm({...form, earSide: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="">-</option><option value="DROITE">Droite</option><option value="GAUCHE">Gauche</option>
              </select></div>
            <div className="col-span-2"><label className="text-sm font-medium">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} /></div>
          </div>
          <button onClick={handleSubmit} className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            {editing ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <th className="text-left px-4 py-3">Produit</th>
            <th className="text-left px-4 py-3">Fournisseur</th>
            <th className="text-left px-4 py-3">Catégorie</th>
            <th className="text-left px-4 py-3">Prix HT</th>
            <th className="text-left px-4 py-3">Disponible</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {produits.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{p.nomProduit}</p>
                  <p className="text-xs text-gray-400">{p.referenceFournisseur || ''}</p>
                </td>
                <td className="px-4 py-3">{fournisseurMap[p.fournisseur?.id] || '-'}</td>
                <td className="px-4 py-3">{p.categorie?.replace('_', ' ')}</td>
                <td className="px-4 py-3">{p.prixUnitaireHt} TND</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(p)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${p.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.isAvailable ? <Check size={16} /> : <X size={16} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(p)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {produits.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucun produit dans le catalogue</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
