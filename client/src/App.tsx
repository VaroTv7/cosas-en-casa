import { useState, useEffect } from 'react';
import './App.css';
import { Package, PlusCircle, Scan, Search } from 'lucide-react';
import InventoryList from './components/InventoryList';
import AddItemForm from './components/AddItemForm';
import Scanner from './components/Scanner';
import ItemDetail from './components/ItemDetail';
import type { Space, Item } from './services/api';
import { getInventory, getItem } from './services/api';

function App() {
  const [view, setView] = useState<'inventory' | 'add' | 'scan'>('inventory');
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
    // Assuming QR contains item ID for now
    // If we implement complex QR, we parse it here.
    // E.g. "item:123" or just "123"
    try {
      const id = val.replace('item:', '');
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
      </nav>

      <main>
        {view === 'inventory' && (
          <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h1>Cosas en Casa</h1>
              <div style={{ position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} />
                <input type="text" placeholder="Buscar..." style={{ paddingLeft: '35px' }} />
              </div>
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

        {view === 'add' && (
          <AddItemForm onSuccess={() => setView('inventory')} />
        )}

        {view === 'scan' && (
          <div className="card">
            <h2>Escanear QR</h2>
            <Scanner onScan={handleScan} />
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
