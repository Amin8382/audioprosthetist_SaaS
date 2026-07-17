export default function PrintButton({ label = 'Imprimer', endpoint, className = '' }) {
  const handlePrint = () => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
    fetch(`${baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      })
      .catch(() => {});
  };

  return (
    <button onClick={handlePrint} className={`px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm ${className}`}>
      {label}
    </button>
  );
}
