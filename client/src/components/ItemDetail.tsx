import React, { useState, useEffect } from 'react';
import type { Item, ItemPhoto } from '../services/api';
import { deleteItem, updateItem, getItemPhotos, addItemPhoto, deleteItemPhoto, setItemPhotoPrimary, generateQRContent } from '../services/api';
import { X, Trash2, Edit, Save, XCircle, Camera, Plus, Star, ChevronLeft, ChevronRight, Image } from 'lucide-react';
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

    // v0.2: Multiple photos
    const [photos, setPhotos] = useState<ItemPhoto[]>([]);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [addingPhoto, setAddingPhoto] = useState(false);

    // Load photos on mount
    useEffect(() => {
        loadPhotos();
    }, [item.id]);

    const loadPhotos = async () => {
        try {
            const data = await getItemPhotos(item.id);
            setPhotos(data);
            setCurrentPhotoIndex(0);
        } catch (err) {
            console.error('Error loading photos:', err);
        }
    };

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

    const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAddingPhoto(true);
        try {
            await addItemPhoto(item.id, file);
            await loadPhotos();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al añadir foto');
        } finally {
            setAddingPhoto(false);
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!confirm('¿Eliminar esta foto?')) return;
        try {
            await deleteItemPhoto(item.id, photoId);
            await loadPhotos();
        } catch (err) {
            alert('Error al eliminar foto');
        }
    };

    const handleSetPrimary = async (photoId: number) => {
        try {
            await setItemPhotoPrimary(item.id, photoId);
            await loadPhotos();
        } catch (err) {
            alert('Error al establecer foto principal');
        }
    };

    const nextPhoto = () => {
        if (photos.length > 0) {
            setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
        }
    };

    const prevPhoto = () => {
        if (photos.length > 0) {
            setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
        }
    };

    // Combine main photo_url with additional photos for display
    const allPhotos = item.photo_url
        ? [{ id: 0, photo_url: item.photo_url, is_primary: 1, item_id: item.id, created_at: '' }, ...photos]
        : photos;

    const currentPhoto = allPhotos[currentPhotoIndex];

    // Generate improved QR content
    const qrContent = generateQRContent(item);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', boxSizing: 'border-box'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', padding: '5px', zIndex: 10 }}>
                    <X size={24} color="white" />
                </button>

                {/* Photo Gallery */}
                {!isEditing && allPhotos.length > 0 && (
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <img
                            src={currentPhoto?.photo_url}
                            alt={item.name}
                            style={{ width: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'contain' }}
                        />

                        {allPhotos.length > 1 && (
                            <>
                                <button
                                    onClick={prevPhoto}
                                    style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '5px' }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={nextPhoto}
                                    style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '5px' }}
                                >
                                    <ChevronRight size={20} />
                                </button>
                                <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8em', opacity: 0.7 }}>
                                    {currentPhotoIndex + 1} / {allPhotos.length}
                                </div>
                            </>
                        )}

                        {/* Photo indicators */}
                        {allPhotos.length > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '5px' }}>
                                {allPhotos.map((_, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setCurrentPhotoIndex(idx)}
                                        style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: idx === currentPhotoIndex ? 'var(--primary)' : 'var(--glass-border)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* No photos placeholder */}
                {!isEditing && allPhotos.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', background: 'var(--glass-border)', borderRadius: '8px', marginBottom: '1rem' }}>
                        <Image size={48} style={{ opacity: 0.5 }} />
                    </div>
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
                                        Cambiar foto principal
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

                        {/* Photo management section */}
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.9em', opacity: 0.8 }}>
                                    Fotos ({photos.length}/10)
                                </span>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.9em' }}>
                                    <Plus size={16} />
                                    <span>{addingPhoto ? 'Añadiendo...' : 'Añadir foto'}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleAddPhoto}
                                        disabled={addingPhoto || photos.length >= 10}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>

                            {/* Photo thumbnails */}
                            {photos.length > 0 && (
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                    {photos.map((p) => (
                                        <div key={p.id} style={{ position: 'relative', flexShrink: 0 }}>
                                            <img
                                                src={p.photo_url}
                                                alt=""
                                                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '4px', border: p.is_primary ? '2px solid var(--primary)' : 'none' }}
                                            />
                                            <div style={{ position: 'absolute', top: 2, right: 2, display: 'flex', gap: 2 }}>
                                                <button
                                                    onClick={() => handleSetPrimary(p.id)}
                                                    style={{ padding: 2, background: p.is_primary ? 'var(--primary)' : 'rgba(0,0,0,0.6)', borderRadius: '50%' }}
                                                    title="Establecer como principal"
                                                >
                                                    <Star size={12} fill={p.is_primary ? 'white' : 'none'} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePhoto(p.id)}
                                                    style={{ padding: 2, background: 'rgba(239,68,68,0.8)', borderRadius: '50%' }}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setIsEditing(true)} style={{ flex: 1, background: 'var(--secondary)' }}>
                                <Edit size={18} style={{ marginRight: '5px' }} /> Editar
                            </button>
                            <button onClick={handleDelete} style={{ flex: 1, background: '#ef4444' }}>
                                <Trash2 size={18} style={{ marginRight: '5px' }} /> Eliminar
                            </button>
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1rem', background: 'white', borderRadius: '8px' }}>
                            <p style={{ color: 'black', margin: 0, fontWeight: 'bold', fontSize: '0.9em' }}>{item.name}</p>
                            <p style={{ color: '#666', margin: '2px 0 10px', fontSize: '0.75em' }}>ID: {item.id}</p>
                            <div style={{ margin: '10px auto', display: 'flex', justifyContent: 'center' }}>
                                <QRCodeSVG value={qrContent} size={150} />
                            </div>
                            <p style={{ color: '#333', fontSize: '0.7em', fontFamily: 'monospace', wordBreak: 'break-all' }}>{qrContent}</p>
                            <p style={{ color: '#666', fontSize: '0.65em', margin: '5px 0 0' }}>QR COSAS-EN-CASA v0.2</p>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default ItemDetail;
