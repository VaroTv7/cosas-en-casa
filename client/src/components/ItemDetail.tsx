import React, { useState, useEffect } from 'react';
import type { Item, ItemPhoto, Category } from '../services/api';
import { deleteItem, getItemPhotos, addItemPhoto, deleteItemPhoto, generateQRContent, getCategories } from '../services/api';
import { X, Trash2, Edit, Plus, ChevronLeft, ChevronRight, Image, Info, Tag, Shield, DollarSign, Book, Gamepad2, Laptop, FileText, Package, UserMinus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import ItemMetadataEditor from './ItemMetadataEditor';

interface Props {
    item: Item;
    onClose: () => void;
    onUpdate: () => void;
}

const ItemDetail: React.FC<Props> = ({ item, onClose, onUpdate }) => {

    // Photos state
    const [photos, setPhotos] = useState<ItemPhoto[]>([]);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [addingPhoto, setAddingPhoto] = useState(false);

    // Metadata state
    const [showMetadataEditor, setShowMetadataEditor] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        loadPhotos();
        getCategories().then(setCategories).catch(console.error);
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
                {allPhotos.length > 0 ? (
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
                        {/* Indicators */}
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
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', background: 'var(--glass-border)', borderRadius: '8px', marginBottom: '1rem' }}>
                        <Image size={48} style={{ opacity: 0.5 }} />
                    </div>
                )}

                {/* Header Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h2 style={{ margin: 0 }}>{item.name}</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setShowMetadataEditor(true)} style={{ background: 'var(--secondary)', padding: '8px' }} title="Editar detalles avanzados">
                                <Edit size={18} />
                            </button>
                            <button onClick={handleDelete} style={{ background: '#ef4444', padding: '8px' }} title="Eliminar ítem">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ opacity: 0.8, margin: 0 }}>Cantidad: {item.quantity}</p>
                        {item.min_quantity !== undefined && item.min_quantity > 0 && (
                            <div style={{
                                fontSize: '0.75em',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: item.quantity <= item.min_quantity ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: item.quantity <= item.min_quantity ? '#ef4444' : '#10b981',
                                border: `1px solid ${item.quantity <= item.min_quantity ? '#ef4444' : '#10b981'}`
                            }}>
                                {item.quantity <= item.min_quantity ? 'Stock Bajo' : 'Stock OK'} (Min: {item.min_quantity})
                            </div>
                        )}
                    </div>
                </div>

                {item.loaned_to && (
                    <div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', border: '1px solid #3b82f6', marginBottom: '1rem' }}>
                        <h4 style={{ margin: '0 0 5px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
                            <UserMinus size={16} /> En Préstamo
                        </h4>
                        <div style={{ fontSize: '0.9em' }}>
                            Prestado a <strong>{item.loaned_to}</strong>
                            {item.loaned_at && <span style={{ opacity: 0.7 }}> el {new Date(item.loaned_at).toLocaleDateString()}</span>}
                        </div>
                    </div>
                )}

                {item.description && <p style={{ fontStyle: 'italic', marginBottom: '1rem' }}>"{item.description}"</p>}

                {/* Metadata Summary v0.4 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {/* Ficha Técnica General */}
                    <div className="card" style={{ background: 'var(--glass-bg)', padding: '12px', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ margin: '0 0 10px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                            <Info size={16} /> Ficha Técnica
                        </h4>
                        <div style={{ fontSize: '0.85em', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Tag size={14} style={{ opacity: 0.6 }} />
                                <span style={{ opacity: 0.7 }}>Categoría:</span>
                                <span>{categories.find(c => c.id === item.category_id)?.name || 'General'}</span>
                            </div>
                            {item.brand && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Package size={14} style={{ opacity: 0.6 }} />
                                    <span style={{ opacity: 0.7 }}>Marca/Modelo:</span>
                                    <span>{item.brand} {item.model}</span>
                                </div>
                            )}
                            {item.serial_number && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Tag size={14} style={{ opacity: 0.6 }} />
                                    <span style={{ opacity: 0.7 }}>Nº Serie:</span>
                                    <span style={{ fontFamily: 'monospace' }}>{item.serial_number}</span>
                                </div>
                            )}
                            {item.condition && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Info size={14} style={{ opacity: 0.6 }} />
                                    <span style={{ opacity: 0.7 }}>Estado:</span>
                                    <span style={{ textTransform: 'capitalize' }}>{item.condition.replace('_', ' ')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Datos de Compra */}
                    {(item.purchase_date || item.purchase_price || item.purchase_location || item.warranty_end) && (
                        <div className="card" style={{ background: 'var(--glass-bg)', padding: '12px', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
                                <DollarSign size={16} /> Información de Compra
                            </h4>
                            <div style={{ fontSize: '0.85em', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {item.purchase_price && <div><span style={{ opacity: 0.7 }}>Precio:</span> {item.purchase_price}€</div>}
                                {item.purchase_date && <div><span style={{ opacity: 0.7 }}>Fecha:</span> {item.purchase_date}</div>}
                                {item.purchase_location && <div><span style={{ opacity: 0.7 }}>Lugar:</span> {item.purchase_location}</div>}
                                {item.warranty_end && (
                                    <div style={{ color: new Date(item.warranty_end) < new Date() ? '#ef4444' : 'inherit' }}>
                                        <Shield size={14} style={{ marginRight: 4 }} />
                                        <span style={{ opacity: 0.7 }}>Garantía hasta:</span> {item.warranty_end}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Detalles Específicos (Libros, Juegos, etc) */}
                    {(item.book_author || item.game_platform || item.tech_specs) && (
                        <div className="card" style={{ background: 'var(--glass-bg)', padding: '12px', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6' }}>
                                <Plus size={16} /> Detalles Especiales
                            </h4>
                            <div style={{ fontSize: '0.85em', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {item.book_author && (
                                    <>
                                        <div><Book size={14} style={{ marginRight: 6 }} /><span style={{ opacity: 0.7 }}>Autor:</span> {item.book_author}</div>
                                        {item.book_publisher && <div><span style={{ opacity: 0.7 }}>Editorial:</span> {item.book_publisher}</div>}
                                        {item.book_year && <div><span style={{ opacity: 0.7 }}>Año:</span> {item.book_year}</div>}
                                        {item.book_pages && <div><span style={{ opacity: 0.7 }}>Páginas:</span> {item.book_pages}</div>}
                                        {item.book_genre && <div><span style={{ opacity: 0.7 }}>Género:</span> {item.book_genre}</div>}
                                        {item.book_isbn && <div><span style={{ opacity: 0.7 }}>ISBN:</span> {item.book_isbn}</div>}
                                    </>
                                )}
                                {item.game_platform && (
                                    <>
                                        <div><Gamepad2 size={14} style={{ marginRight: 6 }} /><span style={{ opacity: 0.7 }}>Plataforma:</span> {item.game_platform}</div>
                                        {item.game_developer && <div><span style={{ opacity: 0.7 }}>Desarrollador:</span> {item.game_developer}</div>}
                                        {item.game_publisher && <div><span style={{ opacity: 0.7 }}>Publisher:</span> {item.game_publisher}</div>}
                                        {item.game_year && <div><span style={{ opacity: 0.7 }}>Año:</span> {item.game_year}</div>}
                                        {item.game_genre && <div><span style={{ opacity: 0.7 }}>Género:</span> {item.game_genre}</div>}
                                    </>
                                )}
                                {item.tech_specs && (
                                    <>
                                        <div><Laptop size={14} style={{ marginRight: 6 }} /><span style={{ opacity: 0.7 }}>Especificaciones:</span></div>
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>{item.tech_specs}</div>
                                        {item.tech_manual_url && (
                                            <a href={item.tech_manual_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'block', marginTop: 4 }}>
                                                Ver Manual Online
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notas */}
                    {item.notes && (
                        <div className="card" style={{ background: 'var(--glass-bg)', padding: '12px', border: '1px solid var(--glass-border)' }}>
                            <h4 style={{ margin: '0 0 10px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' }}>
                                <FileText size={16} /> Notas
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.85em', whiteSpace: 'pre-wrap' }}>{item.notes}</p>
                        </div>
                    )}
                </div>

                {/* Photo management */}
                <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85em', opacity: 0.8 }}>Otras fotos ({photos.length}/10)</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.85em' }}>
                            <Plus size={16} /> <span>Añadir</span>
                            <input type="file" accept="image/*" capture="environment" onChange={handleAddPhoto} disabled={addingPhoto || photos.length >= 10} style={{ display: 'none' }} />
                        </label>
                    </div>

                    {photos.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                            {photos.map((p) => (
                                <div key={p.id} style={{ position: 'relative', flexShrink: 0 }}>
                                    <img src={p.photo_url} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px', border: p.is_primary ? '2px solid var(--primary)' : 'none' }} />
                                    <div style={{ position: 'absolute', top: -4, right: -4, display: 'flex', gap: 2 }}>
                                        <button onClick={() => handleDeletePhoto(p.id)} style={{ padding: 2, background: '#ef4444', borderRadius: '50%' }}><Trash2 size={10} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* QR Section */}
                <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1rem', background: 'white', borderRadius: '8px' }}>
                    <p style={{ color: 'black', margin: 0, fontWeight: 'bold', fontSize: '0.9em' }}>{item.name}</p>
                    <p style={{ color: '#666', margin: '2px 0 10px', fontSize: '0.75em' }}>ID: {item.id}</p>
                    <div style={{ margin: '10px auto', display: 'flex', justifyContent: 'center' }}>
                        <QRCodeSVG value={qrContent} size={140} />
                    </div>
                    <p style={{ color: '#666', fontSize: '0.65em', margin: 0 }}>QR COSAS-EN-CASA v0.6</p>
                </div>

            </div>

            {
                showMetadataEditor && (
                    <ItemMetadataEditor
                        item={item}
                        onClose={() => setShowMetadataEditor(false)}
                        onSaved={() => { setShowMetadataEditor(false); onUpdate(); }}
                    />
                )
            }
        </div >
    );
};

export default ItemDetail;
