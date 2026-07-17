import { useState, useEffect } from 'react';
import api from '../services/api';

export default function BlReceptionTable({ lignes = [], onChange, fournisseurBlNumero, fournisseurBlDate }) {
  const [stockItems, setStockItems] = useState([]);
  const [searchTerms, setSearchTerms] = useState([]);

  useEffect(() => {
    api.get('/stocks').then(r => setStockItems(r.data?.content || r.data || [])).catch(() => {});
  }, []);

  const items = Array.isArray(lignes) ? lignes : [];

  const updateLigne = (idx, field, value) => {
    const updated = items.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    onChange(updated);
  };

  const addLigne = () => {
    onChange([...items, { description: '', quantity: 1, unit_price_ht: 0, stockItemId: '' }]);
  };

  const removeLigne = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const filteredItems = (term) => {
    if (!term) return [];
    const lower = term.toLowerCase();
    return stockItems.filter(s =>
      s.name?.toLowerCase().includes(lower) ||
      s.reference?.toLowerCase().includes(lower)
    ).slice(0, 5);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 px-2">
        <div className="col-span-4">Description</div>
        <div className="col-span-2 text-center">Qté</div>
        <div className="col-span-2 text-center">Prix HT</div>
        <div className="col-span-3">Stock item</div>
        <div className="col-span-1"></div>
      </div>
      {items.map((l, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-4">
            <input value={l.description || ''} onChange={e => updateLigne(i, 'description', e.target.value)}
              placeholder="Description" className="w-full px-2 py-1.5 border rounded text-sm" />
          </div>
          <div className="col-span-2">
            <input type="number" value={l.quantity || 1} onChange={e => updateLigne(i, 'quantity', Number(e.target.value))}
              className="w-full px-2 py-1.5 border rounded text-sm text-center" />
          </div>
          <div className="col-span-2">
            <input type="number" value={l.unit_price_ht || 0} onChange={e => updateLigne(i, 'unit_price_ht', Number(e.target.value))}
              className="w-full px-2 py-1.5 border rounded text-sm text-center" />
          </div>
          <div className="col-span-3 relative">
            <input value={searchTerms[i] || ''} onChange={e => {
              const newTerms = [...searchTerms]; newTerms[i] = e.target.value; setSearchTerms(newTerms);
            }} placeholder="Rechercher..." className="w-full px-2 py-1.5 border rounded text-sm" />
            {searchTerms[i] && searchTerms[i].length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded-b shadow-lg max-h-32 overflow-y-auto">
                {filteredItems(searchTerms[i]).map(s => (
                  <button key={s.id} type="button" onClick={() => {
                    updateLigne(i, 'stockItemId', s.id);
                    updateLigne(i, 'description', s.name || s.description);
                    const newTerms = [...searchTerms]; newTerms[i] = ''; setSearchTerms(newTerms);
                  }} className="w-full text-left px-2 py-1 text-xs hover:bg-gray-50">
                    {s.name || s.reference || s.description}
                  </button>
                ))}
                {filteredItems(searchTerms[i]).length === 0 && (
                  <div className="px-2 py-1 text-xs text-gray-400">Aucun résultat</div>
                )}
              </div>
            )}
          </div>
          <div className="col-span-1">
            <button type="button" onClick={() => removeLigne(i)} className="text-xs text-red-500 hover:underline">✕</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addLigne} className="text-sm text-primary-600 hover:underline">+ Ajouter une ligne</button>
    </div>
  );
}
