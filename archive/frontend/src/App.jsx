import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ClientsList from './modules/clients/ClientsList';
import ClientDetail from './modules/clients/ClientDetail';
import ClientForm from './modules/clients/ClientForm';
import VentesList from './modules/ventes/VentesList';
import VenteForm from './modules/ventes/VenteForm';
import VenteDetail from './modules/ventes/VenteDetail';
import FacturesList from './modules/facturation/FacturesList';
import FactureForm from './modules/facturation/FactureForm';
import FactureDetail from './modules/facturation/FactureDetail';
import FournisseursList from './modules/fournisseurs/FournisseursList';
import FournisseurDetail from './modules/fournisseurs/FournisseurDetail';
import FournisseurForm from './modules/fournisseurs/FournisseurForm';
import BonsCommandeList from './modules/fournisseurs/BonsCommandeList';
import ReparationsList from './modules/fournisseurs/ReparationsList';
import StocksList from './modules/stocks/StocksList';
import StockForm from './modules/stocks/StockForm';
import StockDetail from './modules/stocks/StockDetail';
import StockAlertes from './modules/stocks/StockAlertes';
import TresorerieList from './modules/tresorerie/TresorerieList';
import TresorerieBilan from './modules/tresorerie/TresorerieBilan';
import TresorerieBordereau from './modules/tresorerie/TresorerieBordereau';
import ConfigClinique from './modules/configuration/ConfigClinique';
import ConfigUsers from './modules/configuration/ConfigUsers';
import MarketplacePage from './modules/marketplace/MarketplacePage';
import MarketplacePanier from './modules/marketplace/MarketplacePanier';
import CatalogueAdmin from './modules/marketplace/CatalogueAdmin';
import FournisseurCatalogue from './modules/fournisseur/FournisseurCatalogue';
import FournisseurCommandes from './modules/fournisseur/FournisseurCommandes';
import NoahImport from './modules/noah/NoahImport';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/clients" replace />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="clients/new" element={<ClientForm />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="ventes" element={<VentesList />} />
        <Route path="ventes/new" element={<VenteForm />} />
        <Route path="ventes/:id" element={<VenteDetail />} />
        <Route path="factures" element={<FacturesList />} />
        <Route path="factures/new" element={<FactureForm />} />
        <Route path="factures/:id" element={<FactureDetail />} />
        <Route path="fournisseurs" element={<FournisseursList />} />
        <Route path="fournisseurs/new" element={<FournisseurForm />} />
        <Route path="fournisseurs/:id" element={<FournisseurDetail />} />
        <Route path="fournisseurs/:id/edit" element={<FournisseurForm />} />
        <Route path="bons-commande" element={<BonsCommandeList />} />
        <Route path="reparations" element={<ReparationsList />} />
        <Route path="stocks" element={<StocksList />} />
        <Route path="stocks/new" element={<StockForm />} />
        <Route path="stocks/:id" element={<StockDetail />} />
        <Route path="stocks/alertes" element={<StockAlertes />} />
        <Route path="tresorerie" element={<TresorerieList />} />
        <Route path="tresorerie/bilan" element={<TresorerieBilan />} />
        <Route path="tresorerie/bordereau" element={<TresorerieBordereau />} />
        <Route path="configuration" element={<ConfigClinique />} />
        <Route path="configuration/utilisateurs" element={<ConfigUsers />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="marketplace/panier" element={<MarketplacePanier />} />
        <Route path="catalogue" element={<CatalogueAdmin />} />
        <Route path="fournisseur/catalogue" element={<FournisseurCatalogue />} />
        <Route path="fournisseur/commandes" element={<FournisseurCommandes />} />
        <Route path="noah/import" element={<NoahImport />} />
      </Route>
      <Route path="*" element={<Navigate to="/clients" replace />} />
    </Routes>
  );
}
