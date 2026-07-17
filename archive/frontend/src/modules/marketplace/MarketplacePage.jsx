import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ShoppingCart, Search, Filter, Package } from 'lucide-react';

const categories = [
  { value: '', label: 'Toutes' },
  { value: 'APPAREIL_AUDITIF', label: 'Appareils auditifs' },
  { value: 'ACCESSOIRE', label: 'Accessoires' },
  { value: 'PILE', label: 'Piles' },
  { value: 'EMBOUT', label: 'Embouts' },
  { value: 'AUTRE', label: 'Autre' },
];

export default function MarketplacePage() {
  const [produits, setProduits] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState('');
  const [panier, setPanier] = useState(() => JSON.parse(sessionStorage.getItem('panier') || '{}'));

  useEffect(() => {
    api.get('/catalogue', { params: { disponibles: true } }).then(r => setProduits(r.data || [])).catch(() => {});
    api.get('/fournisseurs').then(r => setFournisseurs(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    sessionStorage.setItem('panier', JSON.stringify(panier));
  }, [panier]);

  const addToCart = (produit) => {
    setPanier(prev => {
      const fId = produit.fournisseur.id;
      const items = [...(prev[fId] || [])];
      const existing = items.findIndex(i => i.produitId === produit.id);
      if (existing >= 0) {
        items[existing] = { ...items[existing], quantity: items[existing].quantity + 1 };
      } else {
        items.push({ produitId: produit.id, nomProduit: produit.nomProduit, prixUnitaireHt: produit.prixUnitaireHt, quantity: 1, fournisseurNom: produit.fournisseur.name });
      }
      return { ...prev, [fId]: items };
    });
  };

  const totalPanier = Object.values(panier).reduce((sum, items) => sum + items.reduce((s, i) => s + i.quantity, 0), 0);

  const filtered = produits.filter(p => {
    if (categorie && p.categorie !== categorie) return false;
    if (search && !p.nomProduit.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fournisseurMap = Object.fromEntries(fournisseurs.map(f => [f.id, f.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <Link to="/marketplace/panier" className="relative flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <ShoppingCart size={18} />
          Panier
          {totalPanier > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {totalPanier}
            </span>
          )}
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg" placeholder="Rechercher un produit..." />
        </div>
        <select value={categorie} onChange={e => setCategorie(e.target.value)}
          className="px-4 py-2 border rounded-lg">
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
            <div className="w-full h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              <Package size={48} className="text-gray-300" />
            </div>
            <h3 className="font-semibold text-lg">{p.nomProduit}</h3>
            <p className="text-sm text-gray-500 mb-1">{fournisseurMap[p.fournisseur?.id] || '-'}</p>
            <p className="text-sm text-gray-400 mb-2">{p.referenceFournisseur || ''} {p.earSide ? `- ${p.earSide}` : ''}</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-primary-600">{p.prixUnitaireHt} TND</span>
              <button onClick={() => addToCart(p)}
                className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
                Ajouter
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">Aucun produit disponible</div>
        )}
      </div>
    </div>
  );
}
