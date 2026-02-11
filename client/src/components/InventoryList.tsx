import React, { useState } from 'react';
import type { Space, Item, Container } from '../services/api';
import { updateSpace, deleteSpace, deleteContainer } from '../services/api';
import { Package, Box, Grip, Pencil, Check, X as XIcon, Trash2 } from 'lucide-react';
import api from '../services/api';

interface Props {
    inventory: Space[];
    onSelectItem: (item: Item) => void;
    onRefresh: () => void;
}

const InventoryList: React.FC<Props> = ({ inventory, onSelectItem, onRefresh }) => {
    const [expandedSpace, setExpandedSpace] = useState<number | null>(null);

    // Editing state
    const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
    const [editingContainerId, setEditingContainerId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    if (!inventory || inventory.length === 0) {
        return <div style={{ textAlign: 'center', opacity: 0.7 }}>No hay espacios creados.</div>;
    }

    const toggleSpace = (id: number) => {
        if (editingSpaceId === id) return;
        setExpandedSpace(expandedSpace === id ? null : id);
    };

    // --- SPACE CRUD ---
    const startEditingSpace = (e: React.MouseEvent, space: Space) => {
        e.stopPropagation();
        setEditingSpaceId(space.id);
        setEditingContainerId(null);
        setEditName(space.name);
    };

    const cancelEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSpaceId(null);
        setEditingContainerId(null);
        setEditName('');
    };

    const saveSpace = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            await updateSpace(id, { name: editName });
            setEditingSpaceId(null);
            onRefresh();
        } catch (err) {
            alert('Error al actualizar espacio');
        }
    };

    const handleDeleteSpace = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar este espacio? Debe estar vacío.')) return;
        try {
            await deleteSpace(id);
            onRefresh();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al eliminar espacio');
        }
    };

    // --- CONTAINER CRUD ---
    const startEditingContainer = (e: React.MouseEvent, container: Container) => {
        e.stopPropagation();
        setEditingContainerId(container.id);
        setEditingSpaceId(null);
        setEditName(container.name);
    };

    const saveContainer = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            const formData = new FormData();
            formData.append('name', editName);
            await api.put(`/containers/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setEditingContainerId(null);
            onRefresh();
        } catch (err) {
            alert('Error al actualizar contenedor');
        }
    };

    const handleDeleteContainer = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar este contenedor? Debe estar vacío.')) return;
        try {
            await deleteContainer(id);
            onRefresh();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al eliminar contenedor');
        }
    };

    const renderContainer = (
        container: Container,
        onSelectItem: (item: Item) => void,
        editingContainerId: number | null,
        editName: string,
        setEditName: (name: string) => void,
        saveContainer: (e: React.MouseEvent, id: number) => void,
        cancelEditing: (e: React.MouseEvent) => void,
        startEditingContainer: (e: React.MouseEvent, container: Container) => void,
        handleDeleteContainer: (e: React.MouseEvent, id: number) => void
    ) => (
        <div key={container.id} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
                <Package size={20} color="var(--accent)" />

                {editingContainerId === container.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }} onClick={e => e.stopPropagation()}>
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--accent)', background: 'var(--bg)', color: 'var(--text)', flex: 1 }}
                        />
                        <button onClick={(e) => saveContainer(e, container.id)} style={{ padding: '5px', background: 'var(--accent)' }}><Check size={14} /></button>
                        <button onClick={cancelEditing} style={{ padding: '5px', background: 'var(--glass-border)' }}><XIcon size={14} /></button>
                    </div>
                ) : (
                    <>
                        <span>{container.name}</span>
                        <button
                            onClick={(e) => startEditingContainer(e, container)}
                            style={{ background: 'transparent', padding: '3px', opacity: 0.5 }}
                            title="Editar contenedor"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={(e) => handleDeleteContainer(e, container.id)}
                            style={{ background: 'transparent', padding: '3px', opacity: 0.5, color: '#ef4444' }}
                            title="Eliminar contenedor"
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '0.5rem' }}>
                {container.items && container.items.map(item => (
                    <div
                        key={item.id}
                        style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => onSelectItem(item)}
                    >
                        {item.photo_url ? (
                            <img
                                src={item.photo_url}
                                alt={item.name}
                                loading="lazy"
                                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '4px', marginBottom: '5px' }}
                            />
                        ) : (
                            <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '5px' }}>
                                <Grip size={24} opacity={0.5} />
                            </div>
                        )}
                        <div style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{item.name}</div>
                        <div style={{ fontSize: '0.8em', opacity: 0.7 }}>x{item.quantity}</div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="grid">
            {inventory.map((space) => (
                <div key={space.id} className="card">
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px' }}
                        onClick={() => toggleSpace(space.id)}
                    >
                        <Box className="icon" size={24} color="var(--primary)" />

                        {editingSpaceId === space.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }} onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--primary)', background: 'var(--bg)', color: 'var(--text)', flex: 1 }}
                                />
                                <button onClick={(e) => saveSpace(e, space.id)} style={{ padding: '5px', background: 'var(--primary)' }}><Check size={16} /></button>
                                <button onClick={cancelEditing} style={{ padding: '5px', background: 'var(--glass-border)' }}><XIcon size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <h3 style={{ margin: 0 }}>{space.name}</h3>
                                <button
                                    onClick={(e) => startEditingSpace(e, space)}
                                    style={{ background: 'transparent', padding: '5px', opacity: 0.5 }}
                                    title="Editar espacio"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteSpace(e, space.id)}
                                    style={{ background: 'transparent', padding: '5px', opacity: 0.5, color: '#ef4444' }}
                                    title="Eliminar espacio"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}

                        <span style={{ marginLeft: 'auto', fontSize: '0.8em', opacity: 0.7 }}>
                            {((space.furnitures?.length || 0) + (space.containers?.length || 0))} Elementos
                        </span>
                    </div>


                    {expandedSpace === space.id && (
                        <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--glass-border)' }}>
                            {/* 1. Muebles */}
                            {space.furnitures && space.furnitures.length > 0 && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '0.9em', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Muebles</h4>
                                    {space.furnitures.map(furniture => (
                                        <div key={furniture.id} style={{ marginBottom: '1rem', paddingLeft: '10px', borderLeft: '2px solid var(--accent)' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
                                                    <Box size={14} />
                                                </div>
                                                {furniture.name}
                                                <span style={{ fontSize: '0.8em', opacity: 0.5, fontWeight: 'normal' }}>({furniture.containers?.length || 0} cont.)</span>
                                            </div>

                                            {/* Containers inside furniture */}
                                            {furniture.containers && furniture.containers.length > 0 ? (
                                                furniture.containers.map(container => renderContainer(container, onSelectItem, editingContainerId, editName, setEditName, saveContainer, cancelEditing, startEditingContainer, handleDeleteContainer))
                                            ) : (
                                                <p style={{ fontSize: '0.8em', opacity: 0.5, fontStyle: 'italic', marginLeft: '10px' }}>Mueble vacío</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 2. Contenedores Sueltos */}
                            {space.containers && space.containers.length > 0 && (
                                <div>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '0.9em', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {space.furnitures?.length ? 'Otros Contenedores' : 'Contenedores'}
                                    </h4>
                                    {space.containers.map(container => renderContainer(container, onSelectItem, editingContainerId, editName, setEditName, saveContainer, cancelEditing, startEditingContainer, handleDeleteContainer))}
                                </div>
                            )}

                            {(!space.furnitures?.length && !space.containers?.length) && (
                                <p style={{ fontSize: '0.9em', opacity: 0.5 }}>Espacio vacío</p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default InventoryList;
