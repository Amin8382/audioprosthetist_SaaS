import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function LowStockBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    api.get('/stocks/alertes').then(r => setCount(r.data?.length || 0)).catch(() => {});
  }, []);

  if (count === 0) return null;

  return (
    <Link to="/stocks" className="block bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg mb-4 text-sm hover:bg-amber-100">
      ⚠ {count} article{count > 1 ? 's' : ''} en stock bas — cliquez pour voir
    </Link>
  );
}
