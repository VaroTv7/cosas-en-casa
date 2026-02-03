import React, { useState } from 'react';
import type { Item } from '../services/api';
import { deleteItem, updateItem } from '../services/api';
import { X, Trash2, Edit, Save, XCircle, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
    item: Item;
    onClose: () => void;
    onUpdate: () => void;
}

const ItemDetail: React.FC<Props> = ({ item, onClose, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const [quantity, setQuantity] = useState(item.quantity);
    const [description, setDescription] = useState(item.description || '');
    const [photo, setPhoto] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const handleDelete = async () => {
        if (confirm('¿Estás seguro de que quieres eliminar este ítem?')) {
            try {
                await deleteItem(item.id);
                onUpdate();
            } catch (err) {
                alert('Error al eliminar');
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('quantity', String(quantity));
            formData.append('description', description);
            if (photo) {
                formData.append('photo', photo);
            }
            await updateItem(item.id, formData);
            setIsEditing(false);
            onUpdate();
        } catch (err) {
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const cancelEdit = () => {
        setName(item.name);
        setQuantity(item.quantity);
        setDescription(item.description || '');
        setPhoto(null);
        setIsEditing(false);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', boxSizing: 'border-box'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', padding: '5px' }}>
                    <X size={24} color="white" />
                </button>

                {item.photo_url && !isEditing && (
                    <img src={item.photo_url} alt={item.name} style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', maxHeight: '300px', objectFit: 'contain' }} />
                )}

                {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Editar Ítem</h3>

                        <div className="input-group">
                            <label>Nombre</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem' }}
                            />
                        </div>

                        <div className="input-group">
                            <label>Cantidad</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={e => setQuantity(Number(e.target.value))}
                                min="1"
                                style={{ width: '100%', padding: '0.5rem' }}
                            />
                        </div>

                        <div className="input-group">
                            <label>Descripción</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', minHeight: '80px' }}
                            />
                        </div>

                        <div className="input-group">
                            <label>Nueva Foto (Opcional)</label>
                            <div style={{ border: '1px dashed var(--glass-border)', padding: '1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)}
                                    style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                />
                                {photo ? (
                                    <span>✅ Nueva imagen seleccionada</span>
                                ) : (
                                    <div style={{ color: 'var(--secondary)' }}>
                                        <Camera size={24} style={{ display: 'block', margin: '0 auto 5px' }} />
                                        Cambiar foto
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: 'var(--primary)' }}>
                                <Save size={18} style={{ marginRight: '5px' }} /> {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button onClick={cancelEdit} style={{ flex: 1, background: 'var(--glass-border)' }}>
                                <XCircle size={18} style={{ marginRight: '5px' }} /> Cancelar
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2>{item.name}</h2>
                        <p style={{ opacity: 0.8 }}>Cantidad: {item.quantity}</p>
                        {item.description && <p style={{ fontStyle: 'italic' }}>"{item.description}"</p>}

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setIsEditing(true)} style={{ flex: 1, background: 'var(--secondary)' }}>
                                <Edit size={18} style={{ marginRight: '5px' }} /> Editar
                            </button>
                            <button onClick={handleDelete} style={{ flex: 1, background: '#ef4444' }}>
                                <Trash2 size={18} style={{ marginRight: '5px' }} /> Eliminar
                            </button>
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1rem', background: 'white', borderRadius: '8px' }}>
                            <p style={{ color: 'black', margin: 0, fontWeight: 'bold' }}>ID: {item.id}</p>
                            <div style={{ margin: '10px auto', display: 'flex', justifyContent: 'center' }}>
                                <QRCodeSVG value={`item:${item.id}`} size={150} />
                            </div>
                            <p style={{ color: '#333', fontSize: '0.8em' }}>QR COSAS-EN-CASA</p>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default ItemDetail;
