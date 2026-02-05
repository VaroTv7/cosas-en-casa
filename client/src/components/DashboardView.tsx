import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, UserMinus, CheckCircle, Package, Search, X, MapPin, Box, Loader2, AlertTriangle, Coins } from 'lucide-react';
import type { Space, Item, SearchResults, SearchResultItem, OrphansResponse } from '../services/api';
import { searchGlobal, getOrphans } from '../services/api';

interface Props {
    inventory: Space[];
    onSelectItem: (item: Item) => void;
}

const DashboardView: React.FC<Props> = ({ inventory, onSelectItem }) => {
    const navigate = useNavigate();
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults(null);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchGlobal(searchQuery);
                setSearchResults(results);
                setShowResults(true);
            } catch (e) {
                console.error('Search error:', e);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectResult = (item: SearchResultItem) => {
        setShowResults(false);
        setSearchQuery('');
        onSelectItem(item);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
        setShowResults(false);
    };

    const [orphans, setOrphans] = useState<OrphansResponse>({ items: [], containers: [], furnitures: [] });

    useEffect(() => {
        getOrphans().then(setOrphans).catch(console.error);
    }, [inventory]);

    // Flatten inventory to get all items (recursively including furnitures)
    const allItems = useMemo(() => {
        const items: Item[] = [];
        inventory.forEach(space => {
            if (space.containers) {
                space.containers.forEach(container => {
                    if (container.items) items.push(...container.items);
                });
            }
            if (space.furnitures) {
                space.furnitures.forEach(furniture => {
                    if (furniture.containers) {
                        furniture.containers.forEach(container => {
                            if (container.items) items.push(...container.items);
                        });
                    }
                });
            }
        });
        return items;
    }, [inventory]);

    const totalValue = useMemo(() => {
        return allItems.reduce((sum, item) => sum + (item.purchase_price || 0) * (item.quantity || 1), 0);
    }, [allItems]);

    const lowStockItems = allItems.filter(
        item => item.min_quantity && item.min_quantity > 0 && item.quantity <= item.min_quantity
    );

    const loanedItems = allItems.filter(
        item => item.loaned_to && item.loaned_to.trim().length > 0
    );

    const cardStyle: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '10px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer'
    };

    const sectionTitleStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '24px',
        marginBottom: '16px',
        fontSize: '1.2em',
        fontWeight: 'bold',
        color: 'var(--text-primary)'
    };

    return (
        <div style={{ paddingBottom: '80px' }}>
            <h2 style={{ marginBottom: '20px' }}>Panel de Control</h2>

            {/* Global Search Omnibox */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--glass-bg)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    overflow: 'hidden'
                }}>
                    <Search size={20} style={{ position: 'absolute', left: '14px', opacity: 0.5 }} />
                    <input
                        type="text"
                        placeholder="Buscar objetos, contenedores, espacios..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '14px 40px 14px 44px',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1em',
                            outline: 'none'
                        }}
                    />
                    {isSearching ? (
                        <Loader2 size={18} className="spin" style={{ position: 'absolute', right: '14px', opacity: 0.7, animation: 'spin 1s linear infinite' }} />
                    ) : searchQuery && (
                        <button
                            onClick={clearSearch}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '5px',
                                opacity: 0.7
                            }}
                        >
                            <X size={18} color="white" />
                        </button>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {showResults && searchResults && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '400px',
                        overflowY: 'auto',
                        background: 'var(--surface)',
                        borderRadius: '0 0 12px 12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderTop: 'none',
                        zIndex: 100,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        {searchResults.items.length === 0 && searchResults.containers.length === 0 && searchResults.spaces.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.6 }}>
                                No se encontraron resultados para "{searchQuery}"
                            </div>
                        ) : (
                            <>
                                {/* Items */}
                                {searchResults.items.length > 0 && (
                                    <div>
                                        <div style={{ padding: '8px 14px', fontSize: '0.8em', opacity: 0.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            Objetos ({searchResults.items.length})
                                        </div>
                                        {searchResults.items.map(item => (
                                            <div
                                                key={`item-${item.id}`}
                                                onClick={() => handleSelectResult(item)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px 14px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {item.photo_url ? (
                                                    <img
                                                        src={`http://localhost:8110${item.photo_url}`}
                                                        alt={item.name}
                                                        style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Package size={18} />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.8em', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <MapPin size={12} />
                                                        {item.container_name || 'Sin contenedor'}
                                                        {item.space_name && <span> · {item.space_name}</span>}
                                                    </div>
                                                </div>
                                                {item.loaned_to && (
                                                    <span style={{ fontSize: '0.75em', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px' }}>
                                                        Prestado
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Containers */}
                                {searchResults.containers.length > 0 && (
                                    <div>
                                        <div style={{ padding: '8px 14px', fontSize: '0.8em', opacity: 0.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            Contenedores ({searchResults.containers.length})
                                        </div>
                                        {searchResults.containers.map(c => (
                                            <div
                                                key={`container-${c.id}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px 14px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                }}
                                            >
                                                <Box size={20} style={{ opacity: 0.7 }} />
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                                                    <div style={{ fontSize: '0.8em', opacity: 0.6 }}>{c.space_name || 'Sin espacio'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Orphans Alert */}
            {(orphans.items.length > 0 || orphans.containers.length > 0 || orphans.furnitures.length > 0) && (
                <div
                    onClick={() => navigate('/database?tab=limbo')}
                    style={{
                        background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--error)',
                        borderRadius: '12px', padding: '16px', marginBottom: '20px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        cursor: 'pointer'
                    }}>
                    <AlertTriangle color="var(--error)" size={24} />
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, color: 'var(--error)', fontSize: '1.1em' }}>⚠️ Objetos Perdidos (Limbo)</h3>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.9em' }}>
                            Hay elementos sin ubicación válida:
                            {orphans.items.length > 0 && ` ${orphans.items.length} Objetos`}
                            {orphans.containers.length > 0 && ` ${orphans.containers.length} Contenedores`}
                            {orphans.furnitures.length > 0 && ` ${orphans.furnitures.length} Muebles`}
                        </p>
                    </div>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--glass-bg)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.7 }}>
                        <Package size={18} /> <span style={{ fontSize: '0.9em' }}>Total Objetos</span>
                    </div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{allItems.length}</div>
                </div>
                <div style={{ background: 'var(--glass-bg)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.7 }}>
                        <Coins size={18} /> <span style={{ fontSize: '0.9em' }}>Valor Est.</span>
                    </div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>
                        {totalValue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div style={{ background: 'var(--glass-bg)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.7 }}>
                        {lowStockItems.length > 0 ? <AlertCircle size={18} color="#ef4444" /> : <CheckCircle size={18} color="#10b981" />}
                        <span style={{ fontSize: '0.9em' }}>Alertas Stock</span>
                    </div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: lowStockItems.length > 0 ? '#ef4444' : 'inherit' }}>{lowStockItems.length}</div>
                </div>
                <div style={{ background: 'var(--glass-bg)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.7 }}>
                        <UserMinus size={18} /> <span style={{ fontSize: '0.9em' }}>Prestados</span>
                    </div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: loanedItems.length > 0 ? '#3b82f6' : 'inherit' }}>{loanedItems.length}</div>
                </div>
            </div>

            {/* Empty State */}
            {lowStockItems.length === 0 && loanedItems.length === 0 && orphans.items.length === 0 && orphans.containers.length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.5, padding: '40px' }}>
                    <CheckCircle size={48} style={{ marginBottom: '10px', color: '#10b981' }} />
                    <p>¡Todo en orden! No hay alertas ni préstamos activos.</p>
                </div>
            )}

            {/* Low Stock Section */}
            {lowStockItems.length > 0 && (
                <div>
                    <div style={sectionTitleStyle}>
                        <AlertCircle color="#ef4444" /> Reabastecer ({lowStockItems.length})
                    </div>
                    {lowStockItems.map(item => (
                        <div key={item.id} style={cardStyle} onClick={() => onSelectItem(item)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {item.photo_url ? (
                                    <img
                                        src={`http://localhost:8110${item.photo_url}`}
                                        alt={item.name}
                                        style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Package size={20} />
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.85em', color: '#ef4444' }}>
                                        Stock: {item.quantity} / Min: {item.min_quantity}
                                    </div>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em' }}>
                                BAJO
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Loans Section */}
            {loanedItems.length > 0 && (
                <div>
                    <div style={sectionTitleStyle}>
                        <UserMinus color="#3b82f6" /> Préstamos Activos ({loanedItems.length})
                    </div>
                    {loanedItems.map(item => (
                        <div key={item.id} style={cardStyle} onClick={() => onSelectItem(item)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {item.photo_url ? (
                                    <img
                                        src={`http://localhost:8110${item.photo_url}`}
                                        alt={item.name}
                                        style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Package size={20} />
                                    </div>
                                )}
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                    <div style={{ fontSize: '0.85em', opacity: 0.8 }}>
                                        Prestado a: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{item.loaned_to}</span>
                                    </div>
                                    {item.loaned_at && (
                                        <div style={{ fontSize: '0.75em', opacity: 0.6 }}>
                                            Desde: {new Date(item.loaned_at).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardView;

