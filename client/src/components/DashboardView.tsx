import React, { useMemo } from 'react';
import { AlertCircle, UserMinus, CheckCircle, Package } from 'lucide-react';
import type { Space, Item } from '../services/api';

interface Props {
    inventory: Space[];
    onSelectItem: (item: Item) => void;
}

const DashboardView: React.FC<Props> = ({ inventory, onSelectItem }) => {
    // Flatten inventory to get all items
    const allItems = useMemo(() => {
        const items: Item[] = [];
        inventory.forEach(space => {
            if (space.containers) {
                space.containers.forEach(container => {
                    if (container.items) items.push(...container.items);
                });
            }
        });
        return items;
    }, [inventory]);

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

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--glass-bg)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: lowStockItems.length > 0 ? '#ef4444' : '#10b981' }}>
                        {lowStockItems.length}
                    </div>
                    <div style={{ fontSize: '0.8em', opacity: 0.7 }}>Alertas de Stock</div>
                </div>
                <div style={{ background: 'var(--glass-bg)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#3b82f6' }}>
                        {loanedItems.length}
                    </div>
                    <div style={{ fontSize: '0.8em', opacity: 0.7 }}>Objetos Prestados</div>
                </div>
            </div>

            {/* Empty State */}
            {lowStockItems.length === 0 && loanedItems.length === 0 && (
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
