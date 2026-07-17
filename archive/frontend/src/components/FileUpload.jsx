import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, RefreshCw, Loader } from 'lucide-react';

const MODE_CONFIG = {
  ai_audiogram: {
    accept: 'image/jpeg,image/png,application/pdf',
    maxSize: 10,
    label: 'Glissez l\'audiogramme ici',
    hint: 'JPG, PNG, PDF — max 10MB',
  },
  ai_bl: {
    accept: 'image/jpeg,image/png,application/pdf',
    maxSize: 20,
    label: 'Glissez le BL fournisseur ici',
    hint: 'JPG, PNG, PDF — max 20MB',
  },
  simple: {
    accept: '*/*',
    maxSize: 10,
    label: 'Glissez un fichier ici',
    hint: 'Cliquez ou déposez un fichier',
  },
};

export default function FileUpload({
  mode = 'simple',
  ownerId,
  ownerType,
  documentType,
  accept,
  maxSizeMB,
  onUploadDone,
  label,
  hint,
}) {
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.simple;
  const inputRef = useRef(null);
  const pollingRef = useRef(null);

  const [state, setState] = useState('IDLE');
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [source, setSource] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [editableFields, setEditableFields] = useState({});

  const mimeAccept = accept || cfg.accept;
  const sizeLimit = maxSizeMB || cfg.maxSize;
  const dropLabel = label || cfg.label;
  const dropHint = hint || cfg.hint;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const startPolling = (docId) => {
    const token = localStorage.getItem('token');
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${baseUrl}/documents/${docId}/extraction-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'DONE') {
          clearInterval(pollingRef.current);
          const parsed = data.extractedData ? JSON.parse(data.extractedData) : {};
          setExtractedData(parsed);
          setConfidence(parsed.confidence);
          setSource(parsed.source);
          setEditableFields(parsed);
          setState('RESULT');
        } else if (data.status === 'ERROR') {
          clearInterval(pollingRef.current);
          setErrorMsg(data.extractionError || 'Erreur lors de l\'extraction');
          setState('ERROR');
        }
      } catch { clearInterval(pollingRef.current); setState('ERROR'); setErrorMsg('Erreur réseau'); }
    }, 2000);
  };

  const upload = async (f) => {
    if (f.size > sizeLimit * 1024 * 1024) {
      setErrorMsg(`Le fichier dépasse ${sizeLimit} Mo`);
      setState('ERROR');
      return;
    }
    setFile(f);
    setErrorMsg('');
    setState('UPLOADING');
    setProgress(0);

    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', f);
    form.append('ownerId', ownerId);
    form.append('ownerType', ownerType);
    form.append('documentType', documentType);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', `${baseUrl}/documents/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(form);
      });

      setDocumentId(result.id);

      if (mode === 'simple') {
        setState('RESULT');
        if (onUploadDone) onUploadDone(result);
      } else {
        setState('EXTRACTING');
        startPolling(result.id);
      }
    } catch {
      setErrorMsg('Erreur lors du téléversement');
      setState('ERROR');
    }
  };

  const handleFile = (f) => { if (f) upload(f); };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleRetry = () => {
    setState('IDLE');
    setFile(null);
    setDocumentId(null);
    setExtractedData(null);
    setErrorMsg('');
    setConfidence(null);
  };

  const handleFieldChange = (field, value) => {
    setEditableFields(prev => ({ ...prev, [field]: value }));
  };

  const handleValidate = async () => {
    if (onUploadDone) {
      onUploadDone({ documentId, extractedData: editableFields, confidence, source });
    }
  };

  if (state === 'UPLOADING') {
    return (
      <div className="border-2 border-primary-300 bg-primary-50 rounded-lg p-6 text-center">
        <Loader size={32} className="animate-spin mx-auto mb-3 text-primary-600" />
        <p className="text-sm font-medium text-primary-700 mb-2">Envoi en cours...</p>
        <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
          <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{progress}%</p>
      </div>
    );
  }

  if (state === 'EXTRACTING') {
    return (
      <div className="border-2 border-purple-300 bg-purple-50 rounded-lg p-6 text-center">
        <Loader size={32} className="animate-spin mx-auto mb-3 text-purple-600" />
        <p className="text-sm font-medium text-purple-700">IA en cours d'analyse...</p>
        <p className="text-xs text-purple-500 mt-1">Extraction des données du document</p>
      </div>
    );
  }

  if (state === 'RESULT') {
    if (mode === 'simple') {
      return (
        <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">{file?.name}</span>
          </div>
          <button onClick={handleRetry} className="text-xs text-red-600 hover:underline">Supprimer</button>
        </div>
      );
    }

    if (mode === 'ai_audiogram') {
      return (
        <div className="border-2 border-green-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-sm font-medium">Audiogramme analysé</span>
            </div>
            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Confiance: {confidence != null ? Math.round(confidence * 100) : 0}%</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Oreille gauche</p>
              {[250, 500, 1000, 2000, 4000, 8000].map(hz => (
                <div key={`L${hz}`} className="flex items-center gap-2 text-xs mb-1">
                  <span className="w-12 text-right text-gray-500">{hz}Hz</span>
                  <input type="number" value={editableFields?.audiogram?.left?.[hz] ?? ''} onChange={e => { const a = { ...editableFields.audiogram, left: { ...editableFields?.audiogram?.left, [hz]: Number(e.target.value) } }; handleFieldChange('audiogram', a); }} className="w-16 px-1 py-0.5 border rounded text-center" />
                  <span className="text-gray-400">dB</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Oreille droite</p>
              {[250, 500, 1000, 2000, 4000, 8000].map(hz => (
                <div key={`R${hz}`} className="flex items-center gap-2 text-xs mb-1">
                  <span className="w-12 text-right text-gray-500">{hz}Hz</span>
                  <input type="number" value={editableFields?.audiogram?.right?.[hz] ?? ''} onChange={e => { const a = { ...editableFields.audiogram, right: { ...editableFields?.audiogram?.right, [hz]: Number(e.target.value) } }; handleFieldChange('audiogram', a); }} className="w-16 px-1 py-0.5 border rounded text-center" />
                  <span className="text-gray-400">dB</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleValidate} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Valider</button>
            <button onClick={handleRetry} className="px-3 py-1.5 border text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1"><RefreshCw size={14} /> Réessayer</button>
          </div>
        </div>
      );
    }

    if (mode === 'ai_bl') {
      return (
        <div className="border-2 border-green-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-sm font-medium">BL analysé</span>
            </div>
            <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Confiance: {confidence != null ? Math.round(confidence * 100) : 0}%</span>
          </div>
          {(editableFields?.lignes || []).map((l, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 text-sm">
              <input value={l.description || ''} onChange={e => { const lignes = [...(editableFields.lignes || [])]; lignes[i] = { ...lignes[i], description: e.target.value }; handleFieldChange('lignes', lignes); }} placeholder="Description" className="px-2 py-1 border rounded col-span-2" />
              <input type="number" value={l.quantity || ''} onChange={e => { const lignes = [...(editableFields.lignes || [])]; lignes[i] = { ...lignes[i], quantity: Number(e.target.value) }; handleFieldChange('lignes', lignes); }} placeholder="Qté" className="px-2 py-1 border rounded" />
              <input type="number" value={l.unit_price_ht || ''} onChange={e => { const lignes = [...(editableFields.lignes || [])]; lignes[i] = { ...lignes[i], unit_price_ht: Number(e.target.value) }; handleFieldChange('lignes', lignes); }} placeholder="Prix HT" className="px-2 py-1 border rounded" />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={handleValidate} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Confirmer la réception</button>
            <button onClick={handleRetry} className="px-3 py-1.5 border text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1"><RefreshCw size={14} /> Réessayer</button>
          </div>
        </div>
      );
    }
  }

  if (state === 'ERROR') {
    return (
      <div className="border-2 border-red-300 bg-red-50 rounded-lg p-6 text-center">
        <XCircle size={32} className="mx-auto mb-3 text-red-500" />
        <p className="text-sm font-medium text-red-700 mb-1">{errorMsg || 'Échec de l\'opération'}</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <button onClick={handleRetry} className="px-3 py-1.5 bg-white border text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1"><RefreshCw size={14} /> Réessayer</button>
          {mode === 'ai_bl' && (
            <button onClick={handleValidate} className="px-3 py-1.5 border text-sm rounded-lg hover:bg-gray-50">Saisir manuellement</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500', 'bg-primary-50'); }}
      onDragLeave={e => { e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50'); }}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
    >
      <input ref={inputRef} type="file" accept={mimeAccept} className="hidden" onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); }} />
      <Upload size={28} className="mx-auto mb-2 text-gray-400" />
      <p className="text-sm text-gray-600">{dropLabel}</p>
      <p className="text-xs text-gray-400 mt-1">ou cliquez pour sélectionner</p>
      <p className="text-xs text-gray-400 mt-1">{dropHint}</p>
    </div>
  );
}
