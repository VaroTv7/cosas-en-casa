import { useState, useEffect } from 'react';
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
import type { Space, Item } from './services/api';
import { getInventory } from './services/api';

function App() {
  const [view, setView] = useState<'inventory' | 'add' | 'scan' | 'floorplan' | 'database' | 'settings' | 'dashboard'>('dashboard');
  const [inventory, setInventory] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showPeopleManager, setShowPeopleManager] = useState(false);

  useEffect(() => {
    loadInventory();
  }, [view]); // Reload when view changes (e.g. after adding)

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

  // QR scan handler now handled inside ScannerView component
  const handleItemFromScan = (item: Item) => {
    setSelectedItem(item);
  };

  return (
    <>
      <nav className="nav-bar">
        <button
          className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          <LayoutDashboard size={24} />
          <span>Panel</span>
        </button>
        <button
          className={`nav-item ${view === 'inventory' ? 'active' : ''}`}
          onClick={() => setView('inventory')}
        >
          <Package size={24} />
          <span>Inventario</span>
        </button>
        <button
          className={`nav-item ${view === 'floorplan' ? 'active' : ''}`}
          onClick={() => setView('floorplan')}
        >
          <Map size={24} />
          <span>Plano</span>
        </button>
        <button
          className={`nav-item ${view === 'add' ? 'active' : ''}`}
          onClick={() => setView('add')}
        >
          <Plus size={24} />
          <span>Añadir</span>
        </button>
        <button
          className={`nav-item ${view === 'scan' ? 'active' : ''}`}
          onClick={() => setView('scan')}
        >
          <Scan size={24} />
          <span>Escanear</span>
        </button>
        <button
          className={`nav-item ${view === 'database' ? 'active' : ''}`}
          onClick={() => setView('database')}
        >
          <Database size={24} />
          <span>BD</span>
        </button>
        <button
          className={`nav-item ${view === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          <Settings size={24} />
          <span>Ajustes</span>
        </button>
      </nav>

      <main>
        {view === 'dashboard' && (
          <DashboardView
            inventory={inventory}
            onSelectItem={(item) => setSelectedItem(item)}
          />
        )}

        {view === 'inventory' && (
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
        )}

        {view === 'floorplan' && (
          <FloorPlan onSelectItem={(item) => setSelectedItem(item)} />
        )}

        {view === 'add' && (
          <AddItemForm onSuccess={() => setView('inventory')} />
        )}

        {view === 'scan' && (
          <ScannerView onSelectItem={handleItemFromScan} />
        )}

        {view === 'database' && (
          <DatabaseView />
        )}

        {view === 'settings' && (
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
            <p style={{ opacity: 0.5, marginTop: '2rem', fontSize: '0.8em' }}>Cosas en Casa v0.4 - Extended Item Metadata</p>
          </div>
        )}

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
