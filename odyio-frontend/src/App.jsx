import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './stores/authStore';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Placeholder title="Clients" />} />
          <Route path="/ventes" element={<Placeholder title="Ventes" />} />
          <Route path="/factures" element={<Placeholder title="Factures" />} />
          <Route path="/cnam" element={<Placeholder title="CNAM" />} />
          <Route path="/stocks" element={<Placeholder title="Stocks" />} />
          <Route path="/fournisseurs" element={<Placeholder title="Fournisseurs" />} />
          <Route path="/tresorerie" element={<Placeholder title="Trésorerie" />} />
          <Route path="/marketplace" element={<Placeholder title="Marketplace" />} />
          <Route path="/support" element={<Placeholder title="Support Noah" />} />
          <Route path="/settings" element={<Placeholder title="Paramètres" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Placeholder({ title }) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-2">Page en cours de développement</p>
      </div>
    </div>
  );
}
