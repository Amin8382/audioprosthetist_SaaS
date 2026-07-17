import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ConfigUsers() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', password: '', role: 'STAFF' });

  useEffect(() => { api.get('/config/users').then(r => setUsers(r.data || [])).catch(() => {}); }, []);

  const handleSubmit = async () => {
    await api.post('/config/users', form);
    setShowForm(false);
    window.location.reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Nouvel utilisateur</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
          <th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Nom</th><th className="text-left px-4 py-3">Rôle</th><th className="text-left px-4 py-3">Actif</th>
        </tr></thead><tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">{u.fullName}</td>
              <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-gray-100 rounded">{u.role}</span></td>
              <td className="px-4 py-3">{u.active ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 rounded-xl max-w-md w-full m-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Nouvel utilisateur</h2>
            <div className="space-y-3">
              <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Nom complet" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              <input type="password" placeholder="Mot de passe" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="ADMIN">Admin</option><option value="STAFF">Staff</option><option value="DOCTOR">Médecin</option>
              </select>
              <div className="flex gap-3">
                <button onClick={handleSubmit} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Créer</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
