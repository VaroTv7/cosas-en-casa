import React, { useState, useEffect, useRef } from 'react';
import {
    getFloorPlan,
    getInventory,
    createRoomLayout,
    updateRoomLayout,
    deleteRoomLayout,
    createContainerPosition,
    updateContainerPosition,
    deleteContainerPosition,
    type FloorPlanData,
    type Space,
    type Container,
    type Item
} from '../services/api';
import { Plus, Trash2, Box, Home, X, Settings } from 'lucide-react';

interface Props {
    onSelectItem?: (item: Item) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const FloorPlan: React.FC<Props> = ({ onSelectItem }) => {
    const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
    const [inventory, setInventory] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [dragging, setDragging] = useState<{ type: 'room' | 'container', id: number, offsetX: number, offsetY: number } | null>(null);
    const [resizing, setResizing] = useState<{ id: number, startX: number, startY: number, startW: number, startH: number } | null>(null);
    const [showAddRoom, setShowAddRoom] = useState(false);
    const [showAddContainer, setShowAddContainer] = useState(false);
    const [selectedContainerItems, setSelectedContainerItems] = useState<{ container: Container; items: Item[] } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [planData, invData] = await Promise.all([getFloorPlan(), getInventory()]);
            setFloorPlan(planData);
            setInventory(invData);
        } catch (err) {
            console.error('Error loading floor plan:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRoom = async (spaceId: number) => {
        try {
            const colorIndex = (floorPlan?.rooms.length || 0) % COLORS.length;
            await createRoomLayout({
                space_id: spaceId,
                x: 50 + (floorPlan?.rooms.length || 0) * 20,
                y: 50 + (floorPlan?.rooms.length || 0) * 20,
                color: COLORS[colorIndex]
            });
            await loadData();
            setShowAddRoom(false);
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al añadir habitación');
        }
    };

    const handleAddContainer = async (containerId: number, roomLayoutId?: number) => {
        try {
            await createContainerPosition({
                container_id: containerId,
                room_layout_id: roomLayoutId,
                x: 20,
                y: 20
            });
            await loadData();
            setShowAddContainer(false);
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al añadir contenedor');
        }
    };

    const handleDeleteRoom = async (id: number) => {
        if (!confirm('¿Eliminar esta habitación del plano?')) return;
        try {
            await deleteRoomLayout(id);
            await loadData();
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    const handleDeleteContainer = async (id: number) => {
        if (!confirm('¿Eliminar este contenedor del plano?')) return;
        try {
            await deleteContainerPosition(id);
            await loadData();
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    const handleContainerClick = (containerId: number) => {
        // Find the container and its items from inventory
        for (const space of inventory) {
            const container = space.containers.find(c => c.id === containerId);
            if (container) {
                setSelectedContainerItems({ container, items: container.items || [] });
                return;
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent, type: 'room' | 'container', id: number) => {
        if (!editMode) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const item = type === 'room'
            ? floorPlan?.rooms.find(r => r.id === id)
            : floorPlan?.containers.find(c => c.id === id);

        if (!item) return;

        setDragging({
            type,
            id,
            offsetX: e.clientX - rect.left - item.x,
            offsetY: e.clientY - rect.top - item.y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const newX = Math.max(0, e.clientX - rect.left - dragging.offsetX);
        const newY = Math.max(0, e.clientY - rect.top - dragging.offsetY);

        if (dragging.type === 'room' && floorPlan) {
            setFloorPlan({
                ...floorPlan,
                rooms: floorPlan.rooms.map(r =>
                    r.id === dragging.id ? { ...r, x: newX, y: newY } : r
                )
            });
        } else if (dragging.type === 'container' && floorPlan) {
            setFloorPlan({
                ...floorPlan,
                containers: floorPlan.containers.map(c =>
                    c.id === dragging.id ? { ...c, x: newX, y: newY } : c
                )
            });
        }
    };

    const handleMouseUp = async () => {
        if (!dragging || !floorPlan) return;

        try {
            if (dragging.type === 'room') {
                const room = floorPlan.rooms.find(r => r.id === dragging.id);
                if (room) {
                    await updateRoomLayout(room.id, { x: room.x, y: room.y });
                }
            } else {
                const container = floorPlan.containers.find(c => c.id === dragging.id);
                if (container) {
                    await updateContainerPosition(container.id, { x: container.x, y: container.y });
                }
            }
        } catch (err) {
            console.error('Error saving position:', err);
        }

        setDragging(null);
    };

    const handleResizeStart = (e: React.MouseEvent, roomId: number) => {
        e.stopPropagation();
        if (!editMode) return;

        const room = floorPlan?.rooms.find(r => r.id === roomId);
        if (!room) return;

        setResizing({
            id: roomId,
            startX: e.clientX,
            startY: e.clientY,
            startW: room.width,
            startH: room.height
        });
    };

    const handleResizeMove = (e: React.MouseEvent) => {
        if (!resizing || !floorPlan) return;

        const deltaX = e.clientX - resizing.startX;
        const deltaY = e.clientY - resizing.startY;
        const newW = Math.max(80, resizing.startW + deltaX);
        const newH = Math.max(60, resizing.startH + deltaY);

        setFloorPlan({
            ...floorPlan,
            rooms: floorPlan.rooms.map(r =>
                r.id === resizing.id ? { ...r, width: newW, height: newH } : r
            )
        });
    };

    const handleResizeEnd = async () => {
        if (!resizing || !floorPlan) return;

        const room = floorPlan.rooms.find(r => r.id === resizing.id);
        if (room) {
            try {
                await updateRoomLayout(room.id, { width: room.width, height: room.height });
            } catch (err) {
                console.error('Error saving size:', err);
            }
        }

        setResizing(null);
    };

    // Get spaces not yet on the floor plan
    const availableSpaces = inventory.filter(
        s => !floorPlan?.rooms.some(r => r.space_id === s.id)
    );

    // Get containers not yet on the floor plan
    const availableContainers = inventory.flatMap(s =>
        s.containers.filter(c => !floorPlan?.containers.some(cp => cp.container_id === c.id))
            .map(c => ({ ...c, spaceName: s.name }))
    );

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando plano...</div>;
    }

    return (
        <div style={{ padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>
                    <Home size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {floorPlan?.plan.name || 'Mi Casa'}
                </h2>
                <button
                    onClick={() => setEditMode(!editMode)}
                    style={{
                        background: editMode ? 'var(--primary)' : 'var(--glass-border)',
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}
                >
                    <Settings size={16} />
                    {editMode ? 'Editando' : 'Editar'}
                </button>
            </div>

            {/* Edit mode toolbar */}
            {editMode && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowAddRoom(true)} style={{ background: 'var(--secondary)', fontSize: '0.85em' }}>
                        <Plus size={14} style={{ marginRight: '3px' }} /> Añadir Habitación
                    </button>
                    <button onClick={() => setShowAddContainer(true)} style={{ background: 'var(--secondary)', fontSize: '0.85em' }}>
                        <Plus size={14} style={{ marginRight: '3px' }} /> Añadir Mueble
                    </button>
                </div>
            )}

            {/* Floor plan canvas */}
            <div
                ref={canvasRef}
                onMouseMove={resizing ? handleResizeMove : handleMouseMove}
                onMouseUp={resizing ? handleResizeEnd : handleMouseUp}
                onMouseLeave={resizing ? handleResizeEnd : handleMouseUp}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '400px',
                    background: floorPlan?.plan.background_color || '#1a1a2e',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: editMode ? '2px dashed var(--primary)' : '1px solid var(--glass-border)'
                }}
            >
                {/* Rooms */}
                {floorPlan?.rooms.map(room => (
                    <div
                        key={`room-${room.id}`}
                        onMouseDown={(e) => handleMouseDown(e, 'room', room.id)}
                        style={{
                            position: 'absolute',
                            left: room.x,
                            top: room.y,
                            width: room.width,
                            height: room.height,
                            background: room.color + '40',
                            border: `2px solid ${room.color}`,
                            borderRadius: '8px',
                            cursor: editMode ? 'move' : 'default',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{
                            padding: '5px 8px',
                            background: room.color,
                            color: 'white',
                            fontSize: '0.75em',
                            fontWeight: 'bold',
                            borderRadius: '6px 6px 0 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>{room.space_name}</span>
                            {editMode && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                                    style={{ padding: '2px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>

                        {/* Containers inside this room */}
                        {/* Note: Containers are positioned absolutely on the canvas, not inside rooms */}

                        {/* Resize handle */}
                        {editMode && (
                            <div
                                onMouseDown={(e) => handleResizeStart(e, room.id)}
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    bottom: 0,
                                    width: 15,
                                    height: 15,
                                    cursor: 'se-resize',
                                    background: room.color,
                                    borderRadius: '0 0 6px 0'
                                }}
                            />
                        )}
                    </div>
                ))}

                {/* Containers */}
                {floorPlan?.containers.map(container => (
                    <div
                        key={`container-${container.id}`}
                        onMouseDown={(e) => handleMouseDown(e, 'container', container.id)}
                        onClick={() => !editMode && handleContainerClick(container.container_id)}
                        style={{
                            position: 'absolute',
                            left: container.x,
                            top: container.y,
                            padding: '8px',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '8px',
                            cursor: editMode ? 'move' : 'pointer',
                            userSelect: 'none',
                            minWidth: '60px',
                            textAlign: 'center'
                        }}
                    >
                        <Box size={20} style={{ margin: '0 auto 4px' }} />
                        <div style={{ fontSize: '0.7em', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {container.container_name}
                        </div>
                        {editMode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteContainer(container.id); }}
                                style={{
                                    position: 'absolute', top: -5, right: -5,
                                    padding: '2px', background: '#ef4444', borderRadius: '50%'
                                }}
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>
                ))}

                {/* Empty state */}
                {floorPlan?.rooms.length === 0 && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center', opacity: 0.5
                    }}>
                        <Home size={48} style={{ marginBottom: '10px' }} />
                        <p>Activa "Editar" y añade habitaciones</p>
                    </div>
                )}
            </div>

            {/* Legend */}
            {floorPlan && floorPlan.rooms.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8em' }}>
                    {floorPlan.rooms.map(room => (
                        <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: 12, height: 12, background: room.color, borderRadius: '3px' }} />
                            <span>{room.space_name}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Room Modal */}
            {showAddRoom && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '300px' }}>
                        <h3 style={{ marginTop: 0 }}>Añadir Habitación al Plano</h3>
                        {availableSpaces.length === 0 ? (
                            <p style={{ opacity: 0.7 }}>Todas las habitaciones ya están en el plano</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {availableSpaces.map(space => (
                                    <button
                                        key={space.id}
                                        onClick={() => handleAddRoom(space.id)}
                                        style={{ background: 'var(--glass-border)', textAlign: 'left' }}
                                    >
                                        {space.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setShowAddRoom(false)} style={{ marginTop: '1rem', width: '100%' }}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Add Container Modal */}
            {showAddContainer && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '300px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>Añadir Mueble al Plano</h3>
                        {availableContainers.length === 0 ? (
                            <p style={{ opacity: 0.7 }}>Todos los muebles ya están en el plano</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {availableContainers.map(container => (
                                    <button
                                        key={container.id}
                                        onClick={() => handleAddContainer(container.id)}
                                        style={{ background: 'var(--glass-border)', textAlign: 'left' }}
                                    >
                                        <strong>{container.name}</strong>
                                        <br />
                                        <small style={{ opacity: 0.7 }}>{container.spaceName}</small>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setShowAddContainer(false)} style={{ marginTop: '1rem', width: '100%' }}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Container Items Modal */}
            {selectedContainerItems && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem', boxSizing: 'border-box'
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>
                                <Box size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                {selectedContainerItems.container.name}
                            </h3>
                            <button onClick={() => setSelectedContainerItems(null)} style={{ background: 'transparent', padding: '5px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {selectedContainerItems.items.length === 0 ? (
                            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }}>Este contenedor está vacío</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {selectedContainerItems.items.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => { setSelectedContainerItems(null); onSelectItem?.(item); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '12px', background: 'var(--glass-border)', borderRadius: '8px', cursor: 'pointer'
                                        }}
                                    >
                                        {item.photo_url ? (
                                            <img src={item.photo_url} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '6px' }} />
                                        ) : (
                                            <div style={{ width: 50, height: 50, background: 'var(--glass-bg)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Box size={24} style={{ opacity: 0.5 }} />
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.85em', opacity: 0.7 }}>Cantidad: {item.quantity}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85em', opacity: 0.7 }}>
                            {selectedContainerItems.items.length} objeto(s)
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloorPlan;
