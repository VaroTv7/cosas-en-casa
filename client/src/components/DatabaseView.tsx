import React, { useState, useEffect } from 'react';
import { Home, Box, Package, PenLine, Trash2, Plus, Search, X } from 'lucide-react';
import { getInventory, updateSpace, deleteSpace, updateContainer, deleteContainer, deleteItem, updateItem, createSpace, createContainer, createItem } from '../services/api';

interface Space {
    id: number;
    name: string;
    description?: string;
    parent_id?: number;
    containers: Container[];
}

interface Container {
    id: number;
    name: string;
    description?: string;
    space_id?: number;
    items: Item[];
}

interface Item {
    id: number;
    name: string;
    description?: string;
    container_id?: number;
    quantity: number;
}

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
    const [quantity, setQuantity] = useState(entity?.quantity || 1);
    const [saving, setSaving] = useState(false);

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
            } else if (type === 'items') {
                const formData = new FormData();
                formData.append('name', name);
                formData.append('description', description);
                formData.append('quantity', quantity.toString());
                if (parentId) formData.append('container_id', parentId.toString());
                if (isNew) {
                    await createItem(formData);
                } else {
                    await updateItem(entity.id, formData);
                }
            }
            onSave();
        } catch (err) {
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

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

                    {type === 'items' && (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9em' }}>Contenedor (opcional)</label>
                                <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ width: '100%' }}>
                                    <option value="">Sin contenedor asignado</option>
                                    {containers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9em' }}>Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </>
                    )}

                    <button onClick={handleSave} disabled={saving || !name} className="btn-primary" style={{ marginTop: '0.5rem' }}>
                        {saving ? 'Guardando...' : (isNew ? 'Crear' : 'Guardar')}
                    </button>
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
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al eliminar');
        }
    };

    const tabs: { key: EntityType; label: string; icon: React.ReactNode }[] = [
        { key: 'spaces', label: 'Espacios', icon: <Home size={18} /> },
        { key: 'containers', label: 'Contenedores', icon: <Box size={18} /> },
        { key: 'items', label: 'Objetos', icon: <Package size={18} /> },
    ];

    const renderRow = (type: EntityType, entity: any) => (
        <div key={`${type}-${entity.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
            background: 'var(--glass-bg)', borderRadius: '8px', marginBottom: '8px'
        }}>
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
            {type === 'items' && (
                <span style={{ fontSize: '0.85em', opacity: 0.7 }}>×{entity.quantity}</span>
            )}
            <button
                onClick={() => setEditingEntity({ type, entity })}
                style={{ padding: '6px', background: 'var(--accent)', borderRadius: '6px' }}
            >
                <PenLine size={14} />
            </button>
            <button
                onClick={() => handleDelete(type, entity.id)}
                style={{ padding: '6px', background: '#ef4444', borderRadius: '6px' }}
            >
                <Trash2 size={14} />
            </button>
        </div>
    );

    return (
        <div>
            <h2 style={{ marginBottom: '1rem' }}>📦 Base de Datos</h2>

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
                onClick={() => setEditingEntity({ type: activeTab, entity: {} })}
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
                    {activeTab === 'spaces' && filteredSpaces.map(space => renderRow('spaces', space))}
                    {activeTab === 'containers' && filteredContainers.map(container => renderRow('containers', container))}
                    {activeTab === 'items' && filteredItems.map(item => renderRow('items', item))}

                    {((activeTab === 'spaces' && filteredSpaces.length === 0) ||
                        (activeTab === 'containers' && filteredContainers.length === 0) ||
                        (activeTab === 'items' && filteredItems.length === 0)) && (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>
                                No hay {activeTab === 'spaces' ? 'espacios' : activeTab === 'containers' ? 'contenedores' : 'objetos'}
                            </p>
                        )}
                </div>
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
        </div>
    );
};

export default DatabaseView;
