import { useState, useRef } from 'react';

export default function NoahImport() {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleSelect = (e) => {
    const f = e.target.files?.[0];
    if (f && f.name.endsWith('.xml')) {
      setFile(f);
      setError(null);
    } else {
      setError('Veuillez sélectionner un fichier XML');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/noah/import-xml/async', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Erreur upload');
      const { jobId: id } = await res.json();
      setJobId(id);
      setStatus('importing');
      pollProgress(id);
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const pollProgress = (id) => {
    const evtSource = new EventSource(`/api/noah/import-xml/progress/${id}`);
    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);
        if (data.status === 'DONE') {
          setResult(data);
          setStatus('done');
          evtSource.close();
        } else if (data.status === 'ERROR') {
          setError(data.error || 'Erreur inconnue');
          setStatus('error');
          evtSource.close();
        }
      } catch {}
    };
    evtSource.onerror = () => {
      setError('Connexion perdue');
      setStatus('error');
      evtSource.close();
    };
  };

  const handleSync = async () => {
    if (!file) return;
    setStatus('uploading');
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/noah/import-xml', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Erreur import');
      const data = await res.json();
      setResult(data);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Import Noah XML</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fichier XML Noah
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".xml"
            onChange={handleSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={status === 'importing' || status === 'uploading'}
          />
          {file && <p className="text-xs text-gray-500 mt-1">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={handleUpload} disabled={!file || status === 'importing' || status === 'uploading'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {status === 'importing' ? 'Importation...' : 'Import Async (SSE)'}
          </button>
          <button onClick={handleSync} disabled={!file || status === 'importing' || status === 'uploading'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50">
            Import Synchrone
          </button>
        </div>
        {(status === 'importing' || status === 'uploading') && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: progress.total > 0 ? `${Math.min(100, (progress.current / progress.total) * 100)}%` : '5%' }}>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {progress.currentPatient || 'Importation en cours...'} ({progress.current}/{progress.total})
            </p>
          </div>
        )}
        {status === 'done' && result && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800">Import terminé</h3>
            <p className="text-sm text-green-700 mt-1">
              Total: {result.total} patients &middot; Créés: {result.created} &middot; Mis à jour: {result.updated}
            </p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-700">Erreurs ({result.errors.length}):</p>
                <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <li key={i}>Patient {err.patientId}: {err.reason}</li>
                  ))}
                  {result.errors.length > 20 && <li>... et {result.errors.length - 20} autres</li>}
                </ul>
              </div>
            )}
          </div>
        )}
        {status === 'error' && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
