import { useState, useEffect } from 'react';
import './App.css';
import { Package, PlusCircle, Scan, Map, Database, Settings } from 'lucide-react';
import InventoryList from './components/InventoryList';
import AddItemForm from './components/AddItemForm';
import Scanner from './components/Scanner';
import ItemDetail from './components/ItemDetail';
import FloorPlan from './components/FloorPlan';
import DatabaseView from './components/DatabaseView';
import type { Space, Item } from './services/api';
import { getInventory, getItem } from './services/api';

function App() {
  const [view, setView] = useState<'inventory' | 'add' | 'scan' | 'floorplan' | 'database' | 'settings'>('inventory');
  const [inventory, setInventory] = useState<Space[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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

  const handleScan = async (val: string) => {
    // v0.2: Handle new QR format "cec:ID:Name" or legacy "item:ID"
    try {
      let id: string;

      if (val.startsWith('cec:')) {
        // New format: cec:ID:Name
        const parts = val.split(':');
        id = parts[1];
      } else if (val.startsWith('item:')) {
        // Legacy format: item:ID
        id = val.replace('item:', '');
      } else {
        // Try raw number
        id = val;
      }

      if (!isNaN(Number(id))) {
        const item = await getItem(id);
        setSelectedItem(item);
        setView('inventory'); // Go back to inventory view but with overlay
      } else {
        alert('Código QR no reconocido: ' + val);
      }
    } catch (err) {
      alert('Ítem no encontrado');
    }
  };

  return (
    <>
      <nav className="nav-bar">
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
          <PlusCircle size={24} />
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
          <div className="card">
            <h2>Escanear QR</h2>
            <p style={{ fontSize: '0.85em', opacity: 0.7, marginBottom: '1rem' }}>
              Compatible con formato v0.1 (item:ID) y v0.2 (cec:ID:Nombre)
            </p>
            <Scanner onScan={handleScan} />
          </div>
        )}

        {view === 'database' && (
          <DatabaseView />
        )}

        {view === 'settings' && (
          <div className="card">
            <h2>⚙️ Ajustes</h2>
            <p style={{ opacity: 0.7 }}>Próximamente: tema, exportar/importar datos, etc.</p>
          </div>
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
