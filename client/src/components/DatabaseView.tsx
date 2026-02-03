import React, { useState, useEffect } from 'react';
import { Home, Box, Package, PenLine, Trash2, Plus, Search, X, ChevronRight, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import type { Space, Container, Item } from '../services/api';
import { getInventory, updateSpace, deleteSpace, updateContainer, deleteContainer, deleteItem, getItem, createSpace, createContainer } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import ItemMetadataEditor from './ItemMetadataEditor';
import AddItemForm from './AddItemForm';

type EntityType = 'spaces' | 'containers' | 'items';

interface EditModalProps {
    type: EntityType;
    entity: any;
    spaces: Space[];
    containers: Container[];
    onClose: () => void;
    onSave: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ type, entity, spaces, containers, onClose, onSave }) => {
    const [name, setName] = useState(entity?.name || '');
    const [description, setDescription] = useState(entity?.description || '');
    const [parentId, setParentId] = useState(entity?.parent_id || entity?.space_id || entity?.container_id || '');
    const [saving, setSaving] = useState(false);

    const isItem = type === 'items';
    const isNew = !entity?.id;

    const handleSave = async () => {
        setSaving(true);
        try {
            if (type === 'spaces') {
                if (isNew) {
                    await createSpace({ name, description, parent_id: parentId || null });
                } else {
                    await updateSpace(entity.id, { name, description, parent_id: parentId || null });
                }
            } else if (type === 'containers') {
                const formData = new FormData();
                formData.append('name', name);
                formData.append('description', description);
                if (parentId) formData.append('space_id', parentId.toString());
                if (isNew) {
                    await createContainer(formData);
                } else {
                    await updateContainer(entity.id, formData);
                }
            } else if (isItem && isNew) {
                // Handled by AddItemForm now
                onSave();
                return;
            }
            onSave();
        } catch (err) {
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    if (isItem && !isNew) {
        return (
            <ItemMetadataEditor
                item={entity as Item}
                onClose={onClose}
                onSaved={onSave}
            />
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>
                        {isNew ? 'Nuevo' : 'Editar'} {type === 'spaces' ? 'Espacio' : type === 'containers' ? 'Contenedor' : 'Objeto'}
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', padding: '5px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9em' }}>Nombre *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9em' }}>Descripción</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descripción opcional..."
                            rows={2}
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                    </div>

                    {type === 'containers' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9em' }}>Espacio (opcional)</label>
                            <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ width: '100%' }}>
                                <option value="">Sin espacio asignado</option>
                                {spaces.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {type === 'items' && isNew && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9em' }}>Contenedor (opcional)</label>
                            <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ width: '100%' }}>
                                <option value="">Sin contenedor asignado</option>
                                {containers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button onClick={handleSave} disabled={saving || !name} className="btn-primary" style={{ marginTop: '0.5rem' }}>
                        {saving ? 'Guardando...' : (isNew ? 'Crear' : 'Guardar')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Item Detail Panel
interface ItemDetailPanelProps {
    item: Item & { container_name?: string };
    onClose: () => void;
    onEdit: () => void;
}

const ItemDetailPanel: React.FC<ItemDetailPanelProps> = ({ item, onClose, onEdit }) => {
    const [fullItem, setFullItem] = useState<any>(null);

    useEffect(() => {
        getItem(item.id).then(setFullItem).catch(console.error);
    }, [item.id, item]); // Added item as dependency to refresh when DatabaseView updates its selectedItem state

    const qrValue = `cec:${item.id}:${item.name}`;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <button onClick={onClose} style={{ background: 'transparent', padding: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowLeft size={20} /> Volver
                    </button>
                    <button onClick={onEdit} style={{ padding: '8px 16px', background: 'var(--accent)', borderRadius: '8px' }}>
                        <PenLine size={16} /> Editar
                    </button>
                </div>

                {/* Photo */}
                {(fullItem?.photo_url || item.photo_url) ? (
                    <img
                        src={fullItem?.photo_url || item.photo_url}
                        alt={item.name}
                        style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }}
                    />
                ) : (
                    <div style={{
                        width: '100%', height: '150px', background: 'var(--glass-bg)', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'
                    }}>
                        <ImageIcon size={48} style={{ opacity: 0.3 }} />
                    </div>
                )}

                <h2 style={{ margin: '0 0 0.5rem 0' }}>{item.name}</h2>

                {item.container_name && (
                    <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '0.5rem' }}>
                        📦 En: <strong>{item.container_name}</strong>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ padding: '8px 16px', background: 'var(--glass-bg)', borderRadius: '8px' }}>
                        <strong>Cantidad:</strong> {item.quantity}
                    </div>
                    {fullItem?.tags && (
                        <div style={{ padding: '8px 16px', background: 'var(--glass-bg)', borderRadius: '8px' }}>
                            🏷️ {fullItem.tags}
                        </div>
                    )}
                </div>

                {(item.description || fullItem?.description) && (
                    <div style={{ padding: '1rem', background: 'var(--glass-bg)', borderRadius: '8px', marginBottom: '1rem' }}>
                        <strong>Descripción:</strong>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>{item.description || fullItem?.description}</p>
                    </div>
                )}

                {/* QR Code */}
                <div style={{ textAlign: 'center', padding: '1rem', background: 'white', borderRadius: '12px' }}>
                    <QRCodeSVG value={qrValue} size={120} />
                    <p style={{ margin: '0.5rem 0 0 0', color: '#333', fontSize: '0.8em' }}>{qrValue}</p>
                </div>
            </div>
        </div>
    );
};

interface DatabaseViewProps {
    onSelectItem?: (item: any) => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = () => {
    const [activeTab, setActiveTab] = useState<EntityType>('spaces');
    const [inventory, setInventory] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingEntity, setEditingEntity] = useState<{ type: EntityType; entity: any } | null>(null);
    const [showAddForm, setShowAddForm] = useState<'space' | 'container' | 'item' | null>(null);

    // Drill-down state
    const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
    const [selectedContainer, setSelectedContainer] = useState<(Container & { space_name?: string }) | null>(null);
    const [selectedItem, setSelectedItem] = useState<(Item & { container_name?: string }) | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getInventory();
            setInventory(data);
        } catch (e) {
            console.error('Error loading inventory:', e);
        } finally {
            setLoading(false);
        }
    };

    // Update selection states when inventory changes
    useEffect(() => {
        if (selectedSpace) {
            const updated = inventory.find(s => s.id === selectedSpace.id);
            if (updated) setSelectedSpace(updated);
        }
        if (selectedContainer) {
            const updated = allContainers.find(c => c.id === selectedContainer.id);
            if (updated) setSelectedContainer(updated);
        }
        if (selectedItem) {
            const updated = allItems.find(i => i.id === selectedItem.id);
            if (updated) setSelectedItem(updated);
        }
    }, [inventory]);

    useEffect(() => { loadData(); }, []);

    // Flatten containers and items for easy access
    const allContainers = inventory.flatMap(s => s.containers.map(c => ({ ...c, space_name: s.name })));
    const allItems = allContainers.flatMap(c => c.items.map(i => ({ ...i, container_name: c.name })));

    // Filter based on search
    const filteredSpaces = inventory.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredContainers = allContainers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredItems = allItems.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (type: EntityType, id: number) => {
        if (!confirm('¿Eliminar este elemento?')) return;
        try {
            if (type === 'spaces') await deleteSpace(id);
            else if (type === 'containers') await deleteContainer(id);
            else await deleteItem(id);
            loadData();
            // Clear selections if deleted
            if (type === 'spaces') setSelectedSpace(null);
            if (type === 'containers') setSelectedContainer(null);
            if (type === 'items') setSelectedItem(null);
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al eliminar');
        }
    };

    const tabs: { key: EntityType; label: string; icon: React.ReactNode }[] = [
        { key: 'spaces', label: 'Espacios', icon: <Home size={18} /> },
        { key: 'containers', label: 'Contenedores', icon: <Box size={18} /> },
        { key: 'items', label: 'Objetos', icon: <Package size={18} /> },
    ];

    // Clickable row that navigates to children
    const renderClickableRow = (type: EntityType, entity: any, onClick: () => void, childCount?: number) => (
        <div
            key={`${type}-${entity.id}`}
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                background: 'var(--glass-bg)', borderRadius: '10px', marginBottom: '8px',
                cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--glass-bg)'}
        >
            <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: type === 'spaces' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' :
                    type === 'containers' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' :
                        'linear-gradient(135deg, #10b981, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {type === 'spaces' ? <Home size={20} /> : type === 'containers' ? <Box size={20} /> : <Package size={20} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{entity.name}</div>
                {entity.description && (
                    <div style={{ fontSize: '0.8em', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entity.description}
                    </div>
                )}
                {type === 'containers' && entity.space_name && (
                    <div style={{ fontSize: '0.75em', opacity: 0.5 }}>📍 {entity.space_name}</div>
                )}
                {type === 'items' && entity.container_name && (
                    <div style={{ fontSize: '0.75em', opacity: 0.5 }}>📦 {entity.container_name}</div>
                )}
            </div>

            {childCount !== undefined && (
                <span style={{
                    padding: '4px 10px', background: 'var(--primary)', borderRadius: '12px',
                    fontSize: '0.8em', fontWeight: 'bold'
                }}>
                    {childCount}
                </span>
            )}

            {type === 'items' && (
                <span style={{ fontSize: '0.85em', opacity: 0.7 }}>×{entity.quantity}</span>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); setEditingEntity({ type, entity }); }}
                style={{ padding: '8px', background: 'var(--accent)', borderRadius: '8px' }}
            >
                <PenLine size={14} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); handleDelete(type, entity.id); }}
                style={{ padding: '8px', background: '#ef4444', borderRadius: '8px' }}
            >
                <Trash2 size={14} />
            </button>

            <ChevronRight size={20} style={{ opacity: 0.5 }} />
        </div>
    );

    // Render selected space's containers
    const renderSpaceDetails = (space: Space) => (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <button
                    onClick={() => setSelectedSpace(null)}
                    style={{ background: 'transparent', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <ArrowLeft size={20} /> Volver
                </button>
                <h3 style={{ margin: 0, flex: 1 }}>🏠 {space.name}</h3>
                <button
                    onClick={() => setEditingEntity({ type: 'spaces', entity: space })}
                    style={{ padding: '8px 12px', background: 'var(--accent)', borderRadius: '8px' }}
                >
                    <PenLine size={16} />
                </button>
            </div>

            {space.description && (
                <p style={{ opacity: 0.7, marginBottom: '1rem' }}>{space.description}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>📦 Contenedores ({space.containers.length})</h4>
                <button
                    onClick={() => setShowAddForm('container')}
                    style={{ padding: '8px 12px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Plus size={16} /> Añadir
                </button>
            </div>

            {space.containers.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No hay contenedores en este espacio</p>
            ) : (
                space.containers.map(container =>
                    renderClickableRow('containers', { ...container, space_name: space.name },
                        () => setSelectedContainer({ ...container, space_name: space.name }),
                        container.items.length
                    )
                )
            )}
        </div>
    );

    // Render selected container's items
    const renderContainerDetails = (container: Container & { space_name?: string }) => (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <button
                    onClick={() => setSelectedContainer(null)}
                    style={{ background: 'transparent', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <ArrowLeft size={20} /> Volver
                </button>
                <h3 style={{ margin: 0, flex: 1 }}>📦 {container.name}</h3>
                <button
                    onClick={() => setEditingEntity({ type: 'containers', entity: container })}
                    style={{ padding: '8px 12px', background: 'var(--accent)', borderRadius: '8px' }}
                >
                    <PenLine size={16} />
                </button>
            </div>

            {container.space_name && (
                <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '0.5rem' }}>
                    📍 En: <strong>{container.space_name}</strong>
                </div>
            )}

            {container.description && (
                <p style={{ opacity: 0.7, marginBottom: '1rem' }}>{container.description}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>🎁 Objetos ({container.items.length})</h4>
                <button
                    onClick={() => setShowAddForm('item')}
                    style={{ padding: '8px 12px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Plus size={16} /> Añadir
                </button>
            </div>

            {container.items.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No hay objetos en este contenedor</p>
            ) : (
                container.items.map(item =>
                    renderClickableRow('items', { ...item, container_name: container.name },
                        () => setSelectedItem({ ...item, container_name: container.name })
                    )
                )
            )}
        </div>
    );

    return (
        <div>
            <h2 style={{ marginBottom: '1rem' }}>📦 Base de Datos</h2>

            {/* If viewing a specific space */}
            {selectedSpace && !selectedContainer && renderSpaceDetails(selectedSpace)}

            {/* If viewing a specific container */}
            {selectedContainer && renderContainerDetails(selectedContainer)}

            {/* Main list view */}
            {!selectedSpace && !selectedContainer && (
                <>
                    {/* Search */}
                    <div style={{ marginBottom: '1rem', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', paddingLeft: '40px' }}
                        />
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', borderRadius: '8px',
                                    background: activeTab === tab.key ? 'var(--primary)' : 'var(--glass-bg)',
                                    fontWeight: activeTab === tab.key ? 'bold' : 'normal'
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                                <span style={{ opacity: 0.7, fontSize: '0.85em' }}>
                                    ({tab.key === 'spaces' ? filteredSpaces.length : tab.key === 'containers' ? filteredContainers.length : filteredItems.length})
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Add button */}
                    <button
                        onClick={() => setShowAddForm(activeTab === 'spaces' ? 'space' : activeTab === 'containers' ? 'container' : 'item')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '10px 16px', marginBottom: '1rem',
                            background: 'var(--accent)', borderRadius: '8px', fontWeight: 'bold'
                        }}
                    >
                        <Plus size={18} />
                        Añadir {activeTab === 'spaces' ? 'Espacio' : activeTab === 'containers' ? 'Contenedor' : 'Objeto'}
                    </button>

                    {/* Content */}
                    {loading ? (
                        <p>Cargando...</p>
                    ) : (
                        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {activeTab === 'spaces' && filteredSpaces.map(space =>
                                renderClickableRow('spaces', space, () => setSelectedSpace(space), space.containers.length)
                            )}
                            {activeTab === 'containers' && filteredContainers.map(container =>
                                renderClickableRow('containers', container, () => setSelectedContainer(container), container.items.length)
                            )}
                            {activeTab === 'items' && filteredItems.map(item =>
                                renderClickableRow('items', item, () => setSelectedItem(item))
                            )}

                            {((activeTab === 'spaces' && filteredSpaces.length === 0) ||
                                (activeTab === 'containers' && filteredContainers.length === 0) ||
                                (activeTab === 'items' && filteredItems.length === 0)) && (
                                    <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>
                                        No hay {activeTab === 'spaces' ? 'espacios' : activeTab === 'containers' ? 'contenedores' : 'objetos'}
                                    </p>
                                )}
                        </div>
                    )}
                </>
            )}

            {/* Item Detail Panel */}
            {selectedItem && (
                <ItemDetailPanel
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onEdit={() => { setEditingEntity({ type: 'items', entity: selectedItem }); }}
                />
            )}

            {/* Edit Modal */}
            {editingEntity && (
                <EditModal
                    type={editingEntity.type}
                    entity={editingEntity.entity}
                    spaces={inventory}
                    containers={allContainers}
                    onClose={() => setEditingEntity(null)}
                    onSave={() => { setEditingEntity(null); loadData(); }}
                />
            )}

            {/* Unified Add Modal */}
            {showAddForm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button onClick={() => setShowAddForm(null)} style={{ background: 'transparent' }}><X size={24} /></button>
                        </div>
                        <AddItemForm onSuccess={() => { setShowAddForm(null); loadData(); }} initialMode={showAddForm} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseView;
