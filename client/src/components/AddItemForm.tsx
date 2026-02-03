import React, { useState, useEffect } from 'react';
import type { Space, Container } from '../services/api';
import { createSpace, createContainer, createItem, getInventory } from '../services/api';
import { Camera, Plus } from 'lucide-react';

interface Props {
    onSuccess: () => void;
}

const AddItemForm: React.FC<Props> = ({ onSuccess }) => {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [selectedSpaceId, setSelectedSpaceId] = useState<number | string>('');
    const [containers, setContainers] = useState<Container[]>([]);
    const [selectedContainerId, setSelectedContainerId] = useState<number | string>('');

    // New Entry States
    const [newSpaceName, setNewSpaceName] = useState('');
    const [newContainerName, setNewContainerName] = useState('');

    // Item States
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            const data = await getInventory();
            // setInventory(data); // Unused
            setSpaces(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (selectedSpaceId && selectedSpaceId !== 'new') {
            const space = spaces.find(s => s.id === Number(selectedSpaceId));
            setContainers(space?.containers || []);
        } else {
            setContainers([]);
        }
    }, [selectedSpaceId, spaces]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalContainerId = selectedContainerId;

            // 1. Create Space if needed
            let spaceId = selectedSpaceId;
            if (selectedSpaceId === 'new') {
                const space = await createSpace(newSpaceName);
                spaceId = space.id;
            }

            // 2. Create Container if needed
            if (selectedContainerId === 'new') {
                const formData = new FormData();
                formData.append('name', newContainerName);
                formData.append('space_id', String(spaceId));
                const container = await createContainer(formData);
                finalContainerId = container.id;
            }

            // 3. Create Item
            const formData = new FormData();
            formData.append('name', itemName);
            formData.append('container_id', String(finalContainerId));
            formData.append('quantity', String(quantity));
            if (description) formData.append('description', description);
            if (photo) formData.append('photo', photo);

            await createItem(formData);

            alert('Ítem guardado con éxito!');
            onSuccess();

            // Reset form (optional, or close)
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2>Añadir Nuevo Ítem</h2>

            {/* Space Selection */}
            <div className="input-group">
                <label>Espacio (Habitación)</label>
                <select
                    value={selectedSpaceId}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    required
                >
                    <option value="">Selecciona un espacio...</option>
                    {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="new">+ Crear Nuevo Espacio</option>
                </select>
                {selectedSpaceId === 'new' && (
                    <input
                        type="text"
                        placeholder="Nombre del nuevo espacio"
                        value={newSpaceName}
                        onChange={e => setNewSpaceName(e.target.value)}
                        required
                    />
                )}
            </div>

            {/* Container Selection */}
            <div className="input-group">
                <label>Contenedor (Caja, Mueble)</label>
                <select
                    value={selectedContainerId}
                    onChange={(e) => setSelectedContainerId(e.target.value)}
                    required={selectedSpaceId !== ''}
                    disabled={!selectedSpaceId}
                >
                    <option value="">Selecciona un contenedor...</option>
                    {containers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="new">+ Crear Nuevo Contenedor</option>
                </select>
                {selectedContainerId === 'new' && (
                    <input
                        type="text"
                        placeholder="Nombre del nuevo contenedor"
                        value={newContainerName}
                        onChange={e => setNewContainerName(e.target.value)}
                        required
                    />
                )}
            </div>

            {/* Item Details */}
            <div className="input-group">
                <label>Nombre del objeto</label>
                <input
                    type="text"
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    required
                    placeholder="Ej. Pilas AA"
                />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                    <label>Cantidad</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        min="1"
                    />
                </div>
            </div>

            <div className="input-group">
                <label>Descripción (Opcional)</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Detalles adicionales..."
                    style={{ width: '100%', padding: '0.5rem' }}
                />
            </div>

            <div className="input-group">
                <label>Foto</label>
                <div style={{ border: '1px dashed var(--glass-border)', padding: '1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)}
                        style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    />
                    {photo ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <span>✅ Imagen seleccionada</span>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--secondary)' }}>
                            <Camera size={32} style={{ display: 'block', margin: '0 auto 10px' }} />
                            <span>Toca para tomar foto</span>
                        </div>
                    )}
                </div>
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {loading ? 'Guardando...' : <><Plus size={20} /> Guardar Ítem</>}
            </button>

        </form>
    );
};

export default AddItemForm;
