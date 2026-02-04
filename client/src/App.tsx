import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { Package, Plus, Scan, Map, Database, Settings, LayoutDashboard } from 'lucide-react';
import InventoryList from './components/InventoryList';
import AddItemForm from './components/AddItemForm';
import ScannerView from './components/ScannerView';
import ItemDetail from './components/ItemDetail';
import FloorPlan from './components/FloorPlan';
import DatabaseView from './components/DatabaseView';
import DashboardView from './components/DashboardView';
import CategoryManager from './components/CategoryManager';
import PeopleManager from './components/PeopleManager';
import BackupManager from './components/BackupManager';
import type { Space, Item } from './services/api';
import { getInventory } from './services/api';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showPeopleManager, setShowPeopleManager] = useState(false);

  useEffect(() => {
    loadInventory();
  }, [location.pathname]); // Reload when path changes

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemFromScan = (item: Item) => {
    setSelectedItem(item);
  };

  return (
    <>
      <nav className="nav-bar">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Panel</span>
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Package size={24} />
          <span>Inventario</span>
        </NavLink>
        <NavLink to="/floorplan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Map size={24} />
          <span>Plano</span>
        </NavLink>
        <NavLink to="/add" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Plus size={24} />
          <span>Añadir</span>
        </NavLink>
        <NavLink to="/scan" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Scan size={24} />
          <span>Escanear</span>
        </NavLink>
        <NavLink to="/database" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Database size={24} />
          <span>BD</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Ajustes</span>
        </NavLink>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={
            <DashboardView
              inventory={inventory}
              onSelectItem={(item) => setSelectedItem(item)}
            />
          } />

          <Route path="/inventory" element={
            <div>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Cosas en Casa</h1>
              </header>

              {loading ? <p>Cargando inventario...</p> : (
                <InventoryList
                  inventory={inventory}
                  onSelectItem={(item) => setSelectedItem(item)}
                  onRefresh={loadInventory}
                />
              )}
            </div>
          } />

          <Route path="/floorplan" element={
            <FloorPlan onSelectItem={(item) => setSelectedItem(item)} />
          } />

          <Route path="/add" element={
            <AddItemForm onSuccess={() => navigate('/inventory')} />
          } />

          <Route path="/scan" element={
            <ScannerView onSelectItem={handleItemFromScan} />
          } />

          <Route path="/database" element={
            <DatabaseView />
          } />

          <Route path="/settings" element={
            <div className="card">
              <h2>⚙️ Ajustes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={() => setShowPeopleManager(true)}
                  style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  <LayoutDashboard size={20} />
                  Gestionar Personas
                </button>
                <button
                  onClick={() => setShowCategoryManager(true)}
                  style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  <Database size={20} />
                  Gestionar Categorías
                </button>
                <p style={{ opacity: 0.7, fontSize: '0.9em' }}>Configura los iconos y colores de tus categorías de objetos.</p>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <BackupManager />
              </div>

              <p style={{ opacity: 0.5, marginTop: '2rem', fontSize: '0.8em' }}>Cosas en Casa v0.8 - Real Navigation & Security</p>
            </div>
          } />
        </Routes>

        {showCategoryManager && (
          <CategoryManager onClose={() => setShowCategoryManager(false)} />
        )}

        {showPeopleManager && (
          <PeopleManager onClose={() => setShowPeopleManager(false)} />
        )}

        {selectedItem && (
          <ItemDetail
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdate={() => {
              setSelectedItem(null);
              loadInventory();
            }}
          />
        )}
      </main>
    </>
  );
}

export default App;
