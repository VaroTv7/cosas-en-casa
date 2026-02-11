import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    getFloorPlan,
    getInventory,
    createRoomLayout,
    updateRoomLayout,
    deleteRoomLayout,
    createContainerPosition,
    updateContainerPosition,
    deleteContainerPosition,
    createFurniturePosition,
    updateFurniturePosition,
    deleteFurniturePosition,
    type FloorPlanData,
    type Space,
    type Container,
    type Furniture,
    type Item
} from '../services/api';
import { Plus, Trash2, Box, Home, X, Settings, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Props {
    onSelectItem?: (item: Item) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const FloorPlan: React.FC<Props> = ({ onSelectItem }) => {
    const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
    const [inventory, setInventory] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [dragging, setDragging] = useState<{ type: 'room' | 'container' | 'furniture', id: number, offsetX: number, offsetY: number } | null>(null);
    const [resizing, setResizing] = useState<{ type: 'room' | 'container' | 'furniture', id: number, startX: number, startY: number, startW: number, startH: number } | null>(null);
    const [showAddRoom, setShowAddRoom] = useState(false);
    const [showAddContainer, setShowAddContainer] = useState(false);
    const [showAddFurniture, setShowAddFurniture] = useState(false);
    const [selectedContainerItems, setSelectedContainerItems] = useState<{ container: Container; items: Item[] } | null>(null);
    const [selectedFurniture, setSelectedFurniture] = useState<{ furniture: Furniture; containers: Container[] } | null>(null);

    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
                y: 20,
                width: 70,
                height: 70
            });
            await loadData();
            setShowAddContainer(false);
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al añadir contenedor');
        }
    };

    const handleAddFurniture = async (furnitureId: number, roomLayoutId?: number) => {
        try {
            await createFurniturePosition({
                furniture_id: furnitureId,
                room_layout_id: roomLayoutId,
                x: 20,
                y: 20,
                width: 70,
                height: 70
            });
            await loadData();
            setShowAddContainer(false);
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al añadir mueble');
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

    const handleDeleteFurniture = async (id: number) => {
        if (!confirm('¿Eliminar este mueble del plano?')) return;
        try {
            await deleteFurniturePosition(id);
            await loadData();
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    const handleContainerClick = (containerId: number) => {
        for (const space of inventory) {
            // Check direct containers
            let container = space.containers?.find(c => c.id === containerId);

            // Check containers inside furniture if not found
            if (!container && space.furnitures) {
                for (const furniture of space.furnitures) {
                    container = furniture.containers?.find(c => c.id === containerId);
                    if (container) break;
                }
            }

            if (container) {
                setSelectedContainerItems({ container, items: container.items || [] });
                return;
            }
        }
    };

    const handleFurnitureClick = (furnitureId: number) => {
        for (const space of inventory) {
            const furniture = space.furnitures.find(f => f.id === furnitureId);
            if (furniture) {
                setSelectedFurniture({ furniture, containers: furniture.containers || [] });
                return;
            }
        }
    };

    // Zoom controls
    const handleZoomIn = () => setZoom(z => Math.min(2, z + 0.2));
    const handleZoomOut = () => setZoom(z => Math.max(0.3, z - 0.2));
    const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    // Pan handlers
    const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (editMode) return; // Don't pan in edit mode
        setIsPanning(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setLastPanPos({ x: clientX, y: clientY });
    };

    const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isPanning) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setPan(p => ({
            x: p.x + (clientX - lastPanPos.x),
            y: p.y + (clientY - lastPanPos.y)
        }));
        setLastPanPos({ x: clientX, y: clientY });
    };

    const handlePanEnd = () => setIsPanning(false);

    // Wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(z => Math.min(2, Math.max(0.3, z + delta)));
    };

    const handleMouseDown = (e: React.MouseEvent, type: 'room' | 'container' | 'furniture', id: number) => {
        if (!editMode) return;
        e.stopPropagation();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const item = type === 'room'
            ? floorPlan?.rooms.find(r => r.id === id)
            : (type === 'container'
                ? floorPlan?.containers.find(c => c.id === id)
                : floorPlan?.furnitures.find(f => f.id === id));

        if (!item) return;

        setDragging({
            type,
            id,
            offsetX: (e.clientX - rect.left) / zoom - item.x,
            offsetY: (e.clientY - rect.top) / zoom - item.y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const newX = Math.max(0, (e.clientX - rect.left) / zoom - dragging.offsetX);
        const newY = Math.max(0, (e.clientY - rect.top) / zoom - dragging.offsetY);

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
        } else if (dragging.type === 'furniture' && floorPlan) {
            setFloorPlan({
                ...floorPlan,
                furnitures: floorPlan.furnitures.map(f =>
                    f.id === dragging.id ? { ...f, x: newX, y: newY } : f
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
            } else if (dragging.type === 'container') {
                const container = floorPlan.containers.find(c => c.id === dragging.id);
                if (container) {
                    await updateContainerPosition(container.id, { x: container.x, y: container.y });
                }
            } else if (dragging.type === 'furniture') {
                const furniture = floorPlan.furnitures.find(f => f.id === dragging.id);
                if (furniture) {
                    await updateFurniturePosition(furniture.id, { x: furniture.x, y: furniture.y });
                }
            }
        } catch (err) {
            console.error('Error saving position:', err);
        }

        setDragging(null);
    };

    const handleRotate = async (type: 'room' | 'container' | 'furniture', id: number) => {
        if (!floorPlan) return;

        try {
            if (type === 'room') {
                const room = floorPlan.rooms.find(r => r.id === id);
                if (room) {
                    const newRotation = ((room.rotation || 0) + 90) % 360;
                    setFloorPlan({
                        ...floorPlan,
                        rooms: floorPlan.rooms.map(r => r.id === id ? { ...r, rotation: newRotation } : r)
                    });
                    await updateRoomLayout(room.id, { rotation: newRotation });
                }
            } else if (type === 'furniture') {
                const furniture = floorPlan.furnitures.find(f => f.id === id);
                if (furniture) {
                    const newRotation = ((furniture.rotation || 0) + 90) % 360;
                    setFloorPlan({
                        ...floorPlan,
                        furnitures: floorPlan.furnitures.map(f => f.id === id ? { ...f, rotation: newRotation } : f)
                    });
                    await updateFurniturePosition(furniture.id, { rotation: newRotation });
                }
            }
        } catch (err) {
            console.error('Error rotating:', err);
        }
    };

    const handleResizeStart = (e: React.MouseEvent, type: 'room' | 'container' | 'furniture', id: number) => {
        e.stopPropagation();
        if (!editMode) return;

        const item = type === 'room'
            ? floorPlan?.rooms.find(r => r.id === id)
            : (type === 'container'
                ? floorPlan?.containers.find(c => c.id === id)
                : floorPlan?.furnitures.find(f => f.id === id));
        if (!item) return;

        setResizing({
            type,
            id,
            startX: e.clientX,
            startY: e.clientY,
            startW: (item as any).width || 60,
            startH: (item as any).height || 60
        });
    };

    const handleResizeMove = (e: React.MouseEvent) => {
        if (!resizing || !floorPlan) return;

        const deltaX = (e.clientX - resizing.startX) / zoom;
        const deltaY = (e.clientY - resizing.startY) / zoom;
        const newW = Math.max(40, resizing.startW + deltaX);
        const newH = Math.max(40, resizing.startH + deltaY);

        if (resizing.type === 'room') {
            setFloorPlan({
                ...floorPlan,
                rooms: floorPlan.rooms.map(r =>
                    r.id === resizing.id ? { ...r, width: newW, height: newH } : r
                )
            });
        } else if (resizing.type === 'container') {
            setFloorPlan({
                ...floorPlan,
                containers: floorPlan.containers.map(c =>
                    c.id === resizing.id ? { ...c, width: newW, height: newH } : c
                )
            });
        } else if (resizing.type === 'furniture') {
            setFloorPlan({
                ...floorPlan,
                furnitures: floorPlan.furnitures.map(f =>
                    f.id === resizing.id ? { ...f, width: newW, height: newH } : f
                )
            });
        }
    };

    const handleResizeEnd = async () => {
        if (!resizing || !floorPlan) return;

        try {
            if (resizing.type === 'room') {
                const room = floorPlan.rooms.find(r => r.id === resizing.id);
                if (room) {
                    await updateRoomLayout(room.id, { width: room.width, height: room.height });
                }
            } else if (resizing.type === 'container') {
                const container = floorPlan.containers.find(c => c.id === resizing.id);
                if (container) {
                    await updateContainerPosition(container.id, {
                        width: (container as any).width || 60,
                        height: (container as any).height || 60
                    });
                }
            } else if (resizing.type === 'furniture') {
                const furniture = floorPlan.furnitures.find(f => f.id === resizing.id);
                if (furniture) {
                    await updateFurniturePosition(furniture.id, {
                        width: (furniture as any).width || 60,
                        height: (furniture as any).height || 60
                    });
                }
            }
        } catch (err) {
            console.error('Error saving size:', err);
        }

        setResizing(null);
    };

    const availableSpaces = inventory.filter(
        s => !floorPlan?.rooms.some(r => r.space_id === s.id)
    );

    const availableContainers = inventory.flatMap(s =>
        s.containers.filter(c => !floorPlan?.containers.some(cp => cp.container_id === c.id))
            .map(c => ({ ...c, spaceName: s.name }))
    );

    const availableFurnitures = inventory.flatMap(s =>
        s.furnitures ? s.furnitures.filter(f => !floorPlan?.furnitures.some(fp => fp.furniture_id === f.id))
            .map(f => ({ ...f, spaceName: s.name })) : []
    );

    // v1.0.0: Find which containers are NOT in furniture for the map
    const containersInFurnitureIds = useMemo(() => {
        const ids = new Set<number>();
        inventory.forEach(s => {
            s.furnitures.forEach(f => {
                f.containers.forEach(c => ids.add(c.id));
            });
        });
        return ids;
    }, [inventory]);

    const renderFurniture = (furniture: any, inRoom: boolean = false) => {
        const w = furniture.width || 60;
        const h = furniture.height || 60;
        const rotation = furniture.rotation || 0;

        return (
            <div
                key={`furniture-${furniture.id}`}
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'furniture', furniture.id); }}
                onClick={(e) => { e.stopPropagation(); !editMode && handleFurnitureClick(furniture.furniture_id); }}
                style={{
                    position: 'absolute',
                    left: furniture.x,
                    top: inRoom ? furniture.y + 28 : furniture.y,
                    width: w,
                    height: h,
                    background: 'rgba(59, 130, 246, 0.25)',
                    border: editMode ? '2px dashed #3b82f6' : '2px solid rgba(59, 130, 246, 0.6)',
                    borderRadius: '4px',
                    cursor: editMode ? 'move' : 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9,
                    overflow: 'visible', // Changed to visible for rotate button
                    transform: `rotate(${rotation}deg)`,
                    transition: (dragging || resizing) ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <Home size={Math.min(w, h) * 0.35} style={{ opacity: 0.8, color: '#3b82f6' }} />
                <div style={{
                    fontSize: `${Math.max(8, Math.min(12, w * 0.12))}px`,
                    maxWidth: w - 8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    marginTop: '2px',
                    color: '#3b82f6',
                    fontWeight: 'bold'
                }}>
                    {furniture.furniture_name}
                </div>

                {editMode && (
                    <>
                        {/* Rotate Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRotate('furniture', furniture.id); }}
                            style={{
                                position: 'absolute', top: -10, left: -10,
                                padding: '4px', background: 'var(--primary)', borderRadius: '50%',
                                width: '22px', height: '22px', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                            }}
                            title="Rotar 90°"
                        >
                            <ZoomIn size={12} style={{ transform: 'rotate(45deg)' }} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFurniture(furniture.id); }}
                            style={{
                                position: 'absolute', top: -10, right: -10,
                                padding: '3px', background: '#ef4444', borderRadius: '50%',
                                width: '22px', height: '22px', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                            }}
                        >
                            <Trash2 size={12} />
                        </button>
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'furniture', furniture.id)}
                            style={{
                                position: 'absolute',
                                right: -4,
                                bottom: -4,
                                width: 14,
                                height: 14,
                                cursor: 'se-resize',
                                background: '#3b82f6',
                                borderRadius: '50%',
                                border: '2px solid white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                        />
                    </>
                )}
            </div>
        );
    };

    // Render a container (box) element
    const renderContainer = (container: any, inRoom: boolean = false) => {
        const w = container.width || 60;
        const h = container.height || 60;

        return (
            <div
                key={`container-${container.id}`}
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'container', container.id); }}
                onClick={(e) => { e.stopPropagation(); !editMode && handleContainerClick(container.container_id); }}
                style={{
                    position: 'absolute',
                    left: container.x,
                    top: inRoom ? container.y + 28 : container.y,
                    width: w,
                    height: h,
                    background: 'var(--glass-bg)',
                    border: editMode ? '2px dashed var(--accent)' : '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    cursor: editMode ? 'move' : 'pointer',
                    userSelect: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    overflow: 'hidden'
                }}
            >
                <Box size={Math.min(w, h) * 0.35} style={{ opacity: 0.8 }} />
                <div style={{
                    fontSize: `${Math.max(8, Math.min(12, w * 0.12))}px`,
                    maxWidth: w - 8,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    marginTop: '2px'
                }}>
                    {container.container_name}
                </div>

                {editMode && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteContainer(container.id); }}
                            style={{
                                position: 'absolute', top: -6, right: -6,
                                padding: '3px', background: '#ef4444', borderRadius: '50%',
                                width: '18px', height: '18px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <X size={10} />
                        </button>
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'container', container.id)}
                            style={{
                                position: 'absolute',
                                right: 0,
                                bottom: 0,
                                width: 12,
                                height: 12,
                                cursor: 'se-resize',
                                background: 'var(--accent)',
                                borderRadius: '0 0 6px 0'
                            }}
                        />
                    </>
                )}
            </div>
        );
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando plano...</div>;
    }

    return (
        <div style={{ padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>
                    <Home size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {floorPlan?.plan.name || 'Mi Casa'}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Zoom controls */}
                    <button onClick={handleZoomOut} style={{ padding: '6px 10px', background: 'var(--glass-border)' }} title="Alejar">
                        <ZoomOut size={16} />
                    </button>
                    <span style={{ fontSize: '0.8em', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} style={{ padding: '6px 10px', background: 'var(--glass-border)' }} title="Acercar">
                        <ZoomIn size={16} />
                    </button>
                    <button onClick={handleResetView} style={{ padding: '6px 10px', background: 'var(--glass-border)' }} title="Resetear vista">
                        <Maximize2 size={16} />
                    </button>
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
            </div>

            {/* Edit mode toolbar */}
            {editMode && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowAddRoom(true)} style={{ background: 'var(--secondary)', fontSize: '0.85em' }}>
                        <Plus size={14} style={{ marginRight: '3px' }} /> Añadir Habitación
                    </button>
                    <button onClick={() => setShowAddContainer(true)} style={{ background: 'var(--secondary)', fontSize: '0.85em' }}>
                        <Plus size={14} style={{ marginRight: '3px' }} /> Añadir Contenedor
                    </button>
                    <button onClick={() => setShowAddFurniture(true)} style={{ background: 'var(--secondary)', fontSize: '0.85em' }}>
                        <Plus size={14} style={{ marginRight: '3px' }} /> Añadir Mueble
                    </button>
                    <span style={{ fontSize: '0.75em', opacity: 0.6, alignSelf: 'center' }}>
                        Arrastra esquina inferior derecha para redimensionar
                    </span>
                </div>
            )}

            {/* Floor plan canvas wrapper (for pan) */}
            <div
                ref={containerRef}
                onMouseDown={!editMode ? handlePanStart : undefined}
                onMouseMove={isPanning ? handlePanMove : undefined}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                onTouchStart={!editMode ? handlePanStart : undefined}
                onTouchMove={isPanning ? handlePanMove : undefined}
                onTouchEnd={handlePanEnd}
                onWheel={handleWheel}
                style={{
                    overflow: 'hidden',
                    borderRadius: '12px',
                    border: editMode ? '2px dashed var(--primary)' : '1px solid var(--glass-border)',
                    cursor: isPanning ? 'grabbing' : (editMode ? 'default' : 'grab')
                }}
            >
                {/* Floor plan canvas (zoomable/pannable) */}
                <div
                    ref={canvasRef}
                    onMouseMove={resizing ? handleResizeMove : handleMouseMove}
                    onMouseUp={resizing ? handleResizeEnd : handleMouseUp}
                    onMouseLeave={resizing ? handleResizeEnd : handleMouseUp}
                    style={{
                        position: 'relative',
                        width: '1200px',
                        height: '900px',
                        background: floorPlan?.plan.background_color || '#1a1a2e',
                        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                        transformOrigin: '0 0',
                        transition: isPanning || dragging || resizing ? 'none' : 'transform 0.1s ease-out'
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
                                background: room.color + '25',
                                border: `4px solid ${room.color}`, // Thicker walls
                                borderRadius: '4px',
                                cursor: editMode ? 'move' : 'default',
                                userSelect: 'none',
                                transform: `rotate(${room.rotation || 0}deg)`,
                                transition: (dragging || resizing) ? 'none' : 'transform 0.2s ease-in-out',
                                boxShadow: 'inset 0 0 15px rgba(0,0,0,0.2)'
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
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRotate('room', room.id); }}
                                            style={{ padding: '2px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}
                                        >
                                            <ZoomIn size={12} style={{ transform: 'rotate(45deg)' }} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                                            style={{ padding: '2px', background: 'rgba(239, 68, 68, 0.6)', borderRadius: '4px' }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Furnitures inside this room */}
                            {floorPlan?.furnitures
                                .filter(f => f.room_layout_id === room.id)
                                .map(furniture => renderFurniture(furniture, true))}

                            {/* Containers inside this room (ONLY those not in furniture) */}
                            {floorPlan?.containers
                                .filter(c => c.room_layout_id === room.id && !containersInFurnitureIds.has(c.container_id))
                                .map(container => renderContainer(container, true))}

                            {/* Resize handle for room */}
                            {editMode && (
                                <div
                                    onMouseDown={(e) => handleResizeStart(e, 'room', room.id)}
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

                    {/* Furnitures without room (floating) */}
                    {floorPlan?.furnitures
                        .filter(f => !f.room_layout_id)
                        .map(furniture => renderFurniture(furniture, false))}

                    {/* Containers without room (floating, ONLY those not in furniture) */}
                    {floorPlan?.containers
                        .filter(c => !c.room_layout_id && !containersInFurnitureIds.has(c.container_id))
                        .map(container => renderContainer(container, false))}

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

            {/* Hint for mobile */}
            <p style={{ fontSize: '0.75em', opacity: 0.5, textAlign: 'center', marginTop: '0.5rem' }}>
                Usa los botones +/- para zoom o arrastra para mover el plano
            </p>

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
                        <h3 style={{ marginTop: 0 }}>Añadir Contenedor al Plano</h3>
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
            {/* Furniture Detail Modal (v1.0.0) */}
            {selectedFurniture && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem', boxSizing: 'border-box'
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '8px' }}>
                                    <Home size={24} style={{ color: '#3b82f6' }} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0 }}>{selectedFurniture.furniture.name}</h3>
                                    <p style={{ margin: 0, fontSize: '0.8em', opacity: 0.7 }}>Contenido del mueble</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedFurniture(null)} style={{ background: 'transparent', padding: '5px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {selectedFurniture.containers.length === 0 ? (
                            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }}>Este mueble no tiene cajas asignadas</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                                {selectedFurniture.containers.map(container => (
                                    <div
                                        key={container.id}
                                        onClick={() => { setSelectedFurniture(null); handleContainerClick(container.id); }}
                                        className="container-card-mini"
                                        style={{
                                            padding: '15px',
                                            background: 'var(--glass-border)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'transform 0.2s',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Box size={32} style={{ marginBottom: '8px', opacity: 0.8 }} />
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9em' }}>{container.name}</div>
                                        <div style={{ fontSize: '0.75em', opacity: 0.6 }}>
                                            {container.items?.length || 0} objetos
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Furniture Modal */}
            {showAddFurniture && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
                }}>
                    <div className="card" style={{ width: '90%', maxWidth: '300px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>Añadir Mueble al Plano</h3>
                        {availableFurnitures.length === 0 ? (
                            <p style={{ opacity: 0.7 }}>Todos los muebles ya están en el plano</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {availableFurnitures.map(furniture => (
                                    <button
                                        key={furniture.id}
                                        onClick={() => { handleAddFurniture(furniture.id); setShowAddFurniture(false); }}
                                        style={{ background: 'var(--glass-border)', textAlign: 'left' }}
                                    >
                                        <strong>{furniture.name}</strong>
                                        <br />
                                        <small style={{ opacity: 0.7 }}>{furniture.spaceName}</small>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setShowAddFurniture(false)} style={{ marginTop: '1rem', width: '100%' }}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloorPlan;
