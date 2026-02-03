import React, { useState, useEffect } from 'react';
import { Home, Box, Package, Camera, ArrowLeft, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import type { Space, Category } from '../services/api';
import { createSpace, createContainer, createItem, getInventory, getCategories } from '../services/api';
import CategoryManager from './CategoryManager';

interface Props {
    onSuccess: () => void;
    initialMode?: Mode;
}

type Mode = 'menu' | 'space' | 'container' | 'item';

const AddItemForm: React.FC<Props> = ({ onSuccess, initialMode = 'menu' }) => {
    const [mode, setMode] = useState<Mode>(initialMode);
    const [loading, setLoading] = useState(false);

    // Common data
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [selectedSpaceId, setSelectedSpaceId] = useState<number | string>('');
    const [selectedContainerId, setSelectedContainerId] = useState<number | string>('');
    const [categoryId, setCategoryId] = useState<number | string>('');
    const [photo, setPhoto] = useState<File | null>(null);

    // Advanced fields
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    useEffect(() => {
        if (mode !== 'menu') {
            loadData();
        }
    }, [mode]);

    const loadData = async () => {
        try {
            const [inventoryData, categoriesData] = await Promise.all([
                getInventory(),
                getCategories()
            ]);
            setSpaces(inventoryData);
            setCategories(categoriesData);
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setQuantity(1);
        setSelectedSpaceId('');
        setSelectedContainerId('');
        setCategoryId('');
        setPhoto(null);
        setBrand('');
        setModel('');
        setSerialNumber('');
        setPurchaseDate('');
        setPurchasePrice('');
        setShowAdvanced(false);
        setMode('menu');
    };

    const handleCreateSpace = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createSpace({ name, description });
            alert('¡Espacio creado!');
            onSuccess();
            resetForm();
        } catch (error) {
            alert('Error al crear espacio');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateContainer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSpaceId) return alert('Selecciona un espacio');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('space_id', String(selectedSpaceId));
            if (photo) formData.append('photo', photo);

            await createContainer(formData);
            alert('¡Contenedor creado!');
            onSuccess();
            resetForm();
        } catch (error) {
            alert('Error al crear contenedor');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContainerId) return alert('Selecciona un contenedor');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('container_id', String(selectedContainerId));
            formData.append('quantity', String(quantity));
            if (categoryId) formData.append('category_id', String(categoryId));
            if (description) formData.append('description', description);
            if (photo) formData.append('photo', photo);

            // Advanced fields
            if (brand) formData.append('brand', brand);
            if (model) formData.append('model', model);
            if (serialNumber) formData.append('serial_number', serialNumber);
            if (purchaseDate) formData.append('purchase_date', purchaseDate);
            if (purchasePrice) formData.append('purchase_price', purchasePrice);

            await createItem(formData);
            alert('¡Objeto guardado!');
            onSuccess();
            resetForm();
        } catch (error) {
            alert('Error al guardar objeto');
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'menu') {
        return (
            <div className="card" style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>¿Qué quieres añadir?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        onClick={() => setMode('space')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '1.2rem', background: 'var(--accent)' }}
                    >
                        <Home size={24} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 'bold' }}>Añadir Espacio</div>
                            <div style={{ fontSize: '0.8em', opacity: 0.8 }}>Habitación, trastero, garaje...</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setMode('container')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '1.2rem', background: 'var(--primary)' }}
                    >
                        <Box size={24} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 'bold' }}>Añadir Contenedor</div>
                            <div style={{ fontSize: '0.8em', opacity: 0.8 }}>Caja, armario, estantería...</div>
                        </div>
                    </button>

                    <button
                        onClick={() => setMode('item')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '1.2rem', background: 'var(--secondary)' }}
                    >
                        <Package size={24} />
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 'bold' }}>Añadir Objeto</div>
                            <div style={{ fontSize: '0.8em', opacity: 0.8 }}>Herramientas, libros, cables...</div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <button
                onClick={() => setMode('menu')}
                style={{ background: 'transparent', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '1rem', padding: 0, color: 'var(--primary)' }}
            >
                <ArrowLeft size={18} /> Volver
            </button>

            {mode === 'space' && (
                <form onSubmit={handleCreateSpace} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Home size={24} color="var(--accent)" />
                        <h2 style={{ margin: 0 }}>Nuevo Espacio</h2>
                    </div>
                    <div className="input-group">
                        <label>Nombre de la habitación</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej. Salón, Trastero..." />
                    </div>
                    <div className="input-group">
                        <label>Descripción (Opcional)</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notas sobre este espacio..." style={{ minHeight: '80px' }} />
                    </div>
                    <button type="submit" disabled={loading} style={{ background: 'var(--accent)' }}>
                        {loading ? 'Guardando...' : 'Crear Espacio'}
                    </button>
                </form>
            )}

            {mode === 'container' && (
                <form onSubmit={handleCreateContainer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Box size={24} color="var(--primary)" />
                        <h2 style={{ margin: 0 }}>Nuevo Contenedor</h2>
                    </div>

                    <div className="input-group">
                        <label>¿Dónde está?</label>
                        <select value={selectedSpaceId} onChange={e => setSelectedSpaceId(e.target.value)} required>
                            <option value="">Selecciona espacio...</option>
                            {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Nombre del contenedor</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej. Caja 42, Armario verde..." />
                    </div>

                    <div className="input-group">
                        <label>Descripción</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="¿Qué tipo de cosas guarda?" />
                    </div>

                    <div className="input-group">
                        <label>Foto (Opcional)</label>
                        <PhotoInput photo={photo} onPhotoChange={setPhoto} />
                    </div>

                    <button type="submit" disabled={loading} style={{ background: 'var(--primary)' }}>
                        {loading ? 'Guardando...' : 'Crear Contenedor'}
                    </button>
                </form>
            )}

            {mode === 'item' && (
                <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Package size={24} color="var(--secondary)" />
                        <h2 style={{ margin: 0 }}>Añadir Cosa</h2>
                    </div>

                    <div className="input-group">
                        <label>¿En qué contenedor?</label>
                        <select
                            value={selectedContainerId}
                            onChange={e => setSelectedContainerId(e.target.value)}
                            required
                        >
                            <option value="">Selecciona contenedor...</option>
                            {spaces.map(s => (
                                <optgroup key={s.id} label={s.name}>
                                    {s.containers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Nombre del objeto</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej. Martillo, Cable HDMI..." />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Cantidad</label>
                            <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="1" />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label>Categoría</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">General</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowCategoryManager(true)}
                                    style={{ padding: '8px', background: 'var(--glass-border)', display: 'flex', alignItems: 'center' }}
                                    title="Gestionar categorías"
                                >
                                    <Settings size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9em' }}
                    >
                        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {showAdvanced ? 'Ocultar campos avanzados' : 'Mostrar campos avanzados'}
                    </button>

                    {showAdvanced && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="input-group">
                                    <label>Marca</label>
                                    <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ej: Sony" />
                                </div>
                                <div className="input-group">
                                    <label>Modelo</label>
                                    <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="Ej: PS5" />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Número de Serie</label>
                                <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="S/N, IMEI..." />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className="input-group">
                                    <label>Fecha Compra</label>
                                    <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <label>Precio (€)</label>
                                    <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} step="0.01" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label>Descripción / Notas</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Cualquier detalle importante..." />
                    </div>

                    <div className="input-group">
                        <label>Foto</label>
                        <PhotoInput photo={photo} onPhotoChange={setPhoto} />
                    </div>

                    <button type="submit" disabled={loading} style={{ background: 'var(--secondary)' }}>
                        {loading ? 'Guardando...' : 'Añadir Objeto'}
                    </button>
                </form>
            )}

            {showCategoryManager && (
                <CategoryManager
                    onClose={() => {
                        setShowCategoryManager(false);
                        loadData(); // Refresh both inventory and categories
                    }}
                />
            )}
        </div>
    );
};

const PhotoInput: React.FC<{ photo: File | null; onPhotoChange: (f: File | null) => void }> = ({ photo, onPhotoChange }) => (
    <div style={{ border: '1px dashed var(--glass-border)', padding: '1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
        <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => onPhotoChange(e.target.files ? e.target.files[0] : null)}
            style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
        />
        {photo ? (
            <span>✅ Imagen seleccionada</span>
        ) : (
            <div style={{ color: 'var(--secondary)' }}>
                <Camera size={32} style={{ display: 'block', margin: '0 auto 10px' }} />
                <span>Toca para tomar foto</span>
            </div>
        )}
    </div>
);

export default AddItemForm;
