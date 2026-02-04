import React, { useState, useEffect } from 'react';
import { X, Save, Book, Gamepad2, Laptop, Package, Calendar, DollarSign, Shield, FileText, Settings, UserMinus, AlertCircle, Image, Trash2, CheckCircle, Camera } from 'lucide-react';
import CategoryManager from './CategoryManager';
import type { Item, Category, Person } from '../services/api';
import { getCategories, updateItem, getPeople, getItemPhotos, addItemPhoto, deleteItemPhoto, setItemPhotoPrimary } from '../services/api';

interface Props {
    item: Item;
    onClose: () => void;
    onSaved: () => void;
}

const CONDITIONS = [
    { value: 'nuevo', label: '✨ Nuevo' },
    { value: 'buen_estado', label: '👍 Buen estado' },
    { value: 'usado', label: '📦 Usado' },
    { value: 'dañado', label: '⚠️ Dañado' }
];

const ItemMetadataEditor: React.FC<Props> = ({ item, onClose, onSaved }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [activeTab, setActiveTab] = useState<'general' | 'purchase' | 'category' | 'management' | 'notes' | 'gallery'>('general');
    const [saving, setSaving] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [invoicePhoto, setInvoicePhoto] = useState<File | null>(null);
    const [itemPhotos, setItemPhotos] = useState<any[]>([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);

    const [formData, setFormData] = useState({
        // General
        category_id: item.category_id || '',
        serial_number: item.serial_number || '',
        brand: item.brand || '',
        model: item.model || '',
        condition: item.condition || 'buen_estado',
        // Purchase
        purchase_date: item.purchase_date || '',
        purchase_price: item.purchase_price || '',
        purchase_location: item.purchase_location || '',
        warranty_months: item.warranty_months || '',
        warranty_end: item.warranty_end || '',
        // Book
        book_author: item.book_author || '',
        book_publisher: item.book_publisher || '',
        book_year: item.book_year || '',
        book_pages: item.book_pages || '',
        book_isbn: item.book_isbn || '',
        book_genre: item.book_genre || '',
        // Game
        game_platform: item.game_platform || '',
        game_developer: item.game_developer || '',
        game_publisher: item.game_publisher || '',
        game_year: item.game_year || '',
        game_genre: item.game_genre || '',
        // Tech
        tech_specs: item.tech_specs || '',
        tech_manual_url: item.tech_manual_url || '',
        // Management (v0.5)
        loaned_to: item.loaned_to || '',
        loaned_at: item.loaned_at || '',
        min_quantity: item.min_quantity || 0,
        // Notes
        notes: item.notes || ''
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [cats, peeps, photos] = await Promise.all([
                    getCategories(),
                    getPeople(),
                    getItemPhotos(item.id)
                ]);
                setCategories(cats);
                setPeople(peeps);
                setItemPhotos(photos);
            } catch (e) { console.error(e); }
        };
        loadData();
    }, [item.id]);

    const selectedCategory = categories.find((c: Category) => c.id === Number(formData.category_id));
    const categoryName = selectedCategory?.name?.toLowerCase() || '';

    const handleChange = (field: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                // To allow clearing fields, we send empty string instead of omitting the field
                // The backend parser (addField) handles '' by setting it to NULL
                fd.append(key, value === null || value === undefined ? '' : String(value));
            });
            if (invoicePhoto) fd.append('invoice_photo', invoicePhoto);

            await updateItem(item.id, fd);
            onSaved();
            onClose();
        } catch (err) {
            console.error('Error saving:', err);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px', background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)', borderRadius: '8px',
        color: 'white', fontSize: '0.95em'
    };

    const labelStyle: React.CSSProperties = {
        display: 'block', marginBottom: '4px', fontSize: '0.85em', opacity: 0.8
    };

    const fieldGroup: React.CSSProperties = { marginBottom: '12px' };

    const renderGeneralTab = () => (
        <div>
            <div style={fieldGroup}>
                <label style={labelStyle}>Categoría</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                        value={formData.category_id}
                        onChange={e => handleChange('category_id', e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                    >
                        <option value="">Sin categoría</option>
                        {categories.map((cat: Category) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => setShowCategoryManager(true)}
                        style={{ ...inputStyle, width: 'auto', padding: '10px' }}
                        title="Gestionar categorías"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>
            <div style={fieldGroup}>
                <label style={labelStyle}>Número de serie</label>
                <input type="text" value={formData.serial_number} onChange={e => handleChange('serial_number', e.target.value)} style={inputStyle} placeholder="S/N, IMEI, etc." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={fieldGroup}>
                    <label style={labelStyle}>Marca</label>
                    <input type="text" value={formData.brand} onChange={e => handleChange('brand', e.target.value)} style={inputStyle} />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>Modelo</label>
                    <input type="text" value={formData.model} onChange={e => handleChange('model', e.target.value)} style={inputStyle} />
                </div>
            </div>
            <div style={fieldGroup}>
                <label style={labelStyle}>Estado</label>
                <select value={formData.condition} onChange={e => handleChange('condition', e.target.value)} style={inputStyle}>
                    {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
        </div>
    );

    const renderPurchaseTab = () => (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={fieldGroup}>
                    <label style={labelStyle}><Calendar size={14} style={{ marginRight: 4 }} />Fecha compra</label>
                    <input type="date" value={formData.purchase_date} onChange={e => handleChange('purchase_date', e.target.value)} style={inputStyle} />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}><DollarSign size={14} style={{ marginRight: 4 }} />Precio (€)</label>
                    <input type="number" step="0.01" value={formData.purchase_price} onChange={e => handleChange('purchase_price', e.target.value)} style={inputStyle} />
                </div>
            </div>
            <div style={fieldGroup}>
                <label style={labelStyle}>Lugar de compra</label>
                <input type="text" value={formData.purchase_location} onChange={e => handleChange('purchase_location', e.target.value)} style={inputStyle} placeholder="Amazon, MediaMarkt, etc." />
            </div>

            <div style={fieldGroup}>
                <label style={labelStyle}><FileText size={14} style={{ marginRight: 4 }} />Factura / Ticket</label>
                {item.invoice_photo_url && !invoicePhoto && (
                    <div style={{ marginBottom: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <a href={item.invoice_photo_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FileText size={16} /> Ver factura actual
                        </a>
                    </div>
                )}

                <div style={{ border: '1px dashed var(--glass-border)', padding: '1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => setInvoicePhoto(e.target.files ? e.target.files[0] : null)}
                        style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    />
                    {invoicePhoto ? (
                        <span style={{ color: 'var(--accent)' }}>✅ Nueva factura seleccionada</span>
                    ) : (
                        <span style={{ fontSize: '0.9em', opacity: 0.7 }}>
                            {item.invoice_photo_url ? 'Toc para cambiar factura' : 'Subir foto de factura'}
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={fieldGroup}>
                    <label style={labelStyle}><Shield size={14} style={{ marginRight: 4 }} />Garantía (meses)</label>
                    <input type="number" value={formData.warranty_months} onChange={e => handleChange('warranty_months', e.target.value)} style={inputStyle} />
                </div>
                <div style={fieldGroup}>
                    <label style={labelStyle}>Fin garantía</label>
                    <input type="date" value={formData.warranty_end} onChange={e => handleChange('warranty_end', e.target.value)} style={inputStyle} />
                </div>
            </div>
        </div>
    );

    const renderCategoryTab = () => {
        if (categoryName.includes('libro')) {
            return (
                <div>
                    <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Book size={18} /> Datos del Libro</h4>
                    <div style={fieldGroup}>
                        <label style={labelStyle}>Autor</label>
                        <input type="text" value={formData.book_author} onChange={e => handleChange('book_author', e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Editorial</label>
                            <input type="text" value={formData.book_publisher} onChange={e => handleChange('book_publisher', e.target.value)} style={inputStyle} />
                        </div>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Año</label>
                            <input type="number" value={formData.book_year} onChange={e => handleChange('book_year', e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Páginas</label>
                            <input type="number" value={formData.book_pages} onChange={e => handleChange('book_pages', e.target.value)} style={inputStyle} />
                        </div>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>ISBN</label>
                            <input type="text" value={formData.book_isbn} onChange={e => handleChange('book_isbn', e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    <div style={fieldGroup}>
                        <label style={labelStyle}>Género</label>
                        <input type="text" value={formData.book_genre} onChange={e => handleChange('book_genre', e.target.value)} style={inputStyle} placeholder="Fantasía, Ciencia Ficción, etc." />
                    </div>
                </div>
            );
        }

        if (categoryName.includes('videojuego') || categoryName.includes('juego')) {
            return (
                <div>
                    <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Gamepad2 size={18} /> Datos del Videojuego</h4>
                    <div style={fieldGroup}>
                        <label style={labelStyle}>Plataforma</label>
                        <input type="text" value={formData.game_platform} onChange={e => handleChange('game_platform', e.target.value)} style={inputStyle} placeholder="PS5, Switch, PC, etc." />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Desarrollador</label>
                            <input type="text" value={formData.game_developer} onChange={e => handleChange('game_developer', e.target.value)} style={inputStyle} />
                        </div>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Publisher</label>
                            <input type="text" value={formData.game_publisher} onChange={e => handleChange('game_publisher', e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Año</label>
                            <input type="number" value={formData.game_year} onChange={e => handleChange('game_year', e.target.value)} style={inputStyle} />
                        </div>
                        <div style={fieldGroup}>
                            <label style={labelStyle}>Género</label>
                            <input type="text" value={formData.game_genre} onChange={e => handleChange('game_genre', e.target.value)} style={inputStyle} placeholder="RPG, Acción, etc." />
                        </div>
                    </div>
                </div>
            );
        }

        if (categoryName.includes('electr') || categoryName.includes('tech')) {
            return (
                <div>
                    <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Laptop size={18} /> Datos Técnicos</h4>
                    <div style={fieldGroup}>
                        <label style={labelStyle}>Especificaciones</label>
                        <textarea value={formData.tech_specs} onChange={e => handleChange('tech_specs', e.target.value)} style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} placeholder="RAM, CPU, capacidad, etc." />
                    </div>
                    <div style={fieldGroup}>
                        <label style={labelStyle}>URL del manual</label>
                        <input type="url" value={formData.tech_manual_url} onChange={e => handleChange('tech_manual_url', e.target.value)} style={inputStyle} placeholder="https://..." />
                    </div>
                </div>
            );
        }

        return (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                <Package size={48} style={{ marginBottom: '1rem' }} />
                <p>Selecciona una categoría específica (Libros, Videojuegos, Electrónica) para ver campos adicionales.</p>
            </div>
        );
    };

    const renderManagementTab = () => (
        <div>
            <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18} /> Control de Stock</h4>
            <div style={fieldGroup}>
                <label style={labelStyle}>Cantidad mínima (Alerta)</label>
                <input
                    type="number"
                    value={formData.min_quantity}
                    onChange={e => handleChange('min_quantity', e.target.value)}
                    style={inputStyle}
                    placeholder="0 = sin alerta"
                />
                <p style={{ fontSize: '0.75em', opacity: 0.6, marginTop: '4px' }}>
                    Se mostrará una alerta cuando la cantidad actual sea igual o menor a este valor.
                </p>
            </div>

            <h4 style={{ margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><UserMinus size={18} /> Gestión de Préstamos</h4>
            <div style={fieldGroup}>
                <label style={labelStyle}>Prestado a</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                        value={formData.loaned_to}
                        onChange={e => handleChange('loaned_to', e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                    >
                        <option value="">-- Nadie --</option>
                        {people.map(p => (
                            <option key={p.id} value={p.name}>{p.name} ({p.role})</option>
                        ))}
                    </select>
                </div>
            </div>
            <div style={fieldGroup}>
                <label style={labelStyle}>Fecha de préstamo</label>
                <input
                    type="date"
                    value={formData.loaned_at}
                    onChange={e => handleChange('loaned_at', e.target.value)}
                    style={inputStyle}
                />
            </div>
        </div>
    );

    const renderNotesTab = () => (
        <div>
            <div style={fieldGroup}>
                <label style={labelStyle}><FileText size={14} style={{ marginRight: 4 }} />Notas adicionales</label>
                <textarea
                    value={formData.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    style={{ ...inputStyle, minHeight: '200px', resize: 'vertical' }}
                    placeholder="Cualquier información adicional sobre el objeto..."
                />
            </div>
        </div>
    );

    const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        if (itemPhotos.length >= 10) {
            alert('Máximo 10 fotos por objeto');
            return;
        }

        const file = e.target.files[0];
        const fd = new FormData();
        fd.append('photo', file);

        try {
            setLoadingPhotos(true);
            await addItemPhoto(item.id, file);
            const updated = await getItemPhotos(item.id);
            setItemPhotos(updated);
            onSaved(); // Notify parent to refresh list if needed
        } catch (err) {
            console.error(err);
            alert('Error al subir foto');
        } finally {
            setLoadingPhotos(false);
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!confirm('¿Borrar esta foto?')) return;
        try {
            await deleteItemPhoto(item.id, photoId);
            setItemPhotos(prev => prev.filter(p => p.id !== photoId));
            onSaved();
        } catch (err) { alert('Error al borrar'); }
    };

    const handleSetPrimary = async (photoId: number) => {
        try {
            await setItemPhotoPrimary(item.id, photoId);
            const updated = await getItemPhotos(item.id);
            setItemPhotos(updated);
            onSaved();
        } catch (err) { alert('Error al establecer principal'); }
    };

    const renderGalleryTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {itemPhotos.map((p) => (
                    <div key={p.id} style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: p.is_primary ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                        background: 'rgba(0,0,0,0.3)'
                    }}>
                        <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                            {!p.is_primary && (
                                <button onClick={() => handleDeletePhoto(p.id)} style={{ padding: 4, background: 'rgba(255,0,0,0.6)', borderRadius: '4px' }}>
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        {!p.is_primary && (
                            <button
                                onClick={() => handleSetPrimary(p.id)}
                                style={{
                                    position: 'absolute', bottom: 4, left: 4, right: 4,
                                    background: 'rgba(0,0,0,0.6)', fontSize: '0.7em', padding: '4px',
                                    borderRadius: '4px'
                                }}
                            >
                                Principal
                            </button>
                        )}

                        {p.is_primary && (
                            <div style={{ position: 'absolute', bottom: 4, right: 4, color: 'var(--primary)', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '2px' }}>
                                <CheckCircle size={14} />
                            </div>
                        )}
                    </div>
                ))}

                {itemPhotos.length < 10 && (
                    <div style={{
                        aspectRatio: '1',
                        border: '1px dashed var(--glass-border)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        opacity: loadingPhotos ? 0.5 : 1
                    }}>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleUploadPhoto}
                            disabled={loadingPhotos}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        />
                        <Camera size={24} style={{ marginBottom: 4 }} />
                        <span style={{ fontSize: '0.8em' }}>{loadingPhotos ? 'Subiendo...' : 'Añadir Foto'}</span>
                    </div>
                )}
            </div>
            <p style={{ fontSize: '0.8em', opacity: 0.6, textAlign: 'center' }}>
                Puedes subir hasta 10 fotos por objeto.
            </p>
        </div>
    );



    const tabs = [
        { id: 'general', label: 'General', icon: <Package size={16} /> },
        { id: 'gallery', label: 'Galería', icon: <Image size={16} /> },
        { id: 'purchase', label: 'Compra', icon: <DollarSign size={16} /> },
        { id: 'management', label: 'Gestión', icon: <AlertCircle size={16} /> },
        { id: 'category', label: 'Detalles', icon: selectedCategory ? <Settings size={16} /> : <FileText size={16} /> },
        { id: 'notes', label: 'Notas', icon: <FileText size={16} /> }
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem', boxSizing: 'border-box'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0 }}>Editar Metadatos</h3>
                    <button onClick={onClose} style={{ background: 'transparent', padding: '5px' }}><X size={20} /></button>
                </div>

                <div style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '1rem' }}>
                    <strong>{item.name}</strong>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: activeTab === tab.id ? 'var(--primary)' : 'var(--glass-border)',
                                borderRadius: '6px',
                                fontSize: '0.8em',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                minWidth: '70px'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                    {activeTab === 'general' && renderGeneralTab()}
                    {activeTab === 'gallery' && renderGalleryTab()}
                    {activeTab === 'purchase' && renderPurchaseTab()}
                    {activeTab === 'management' && renderManagementTab()}
                    {activeTab === 'category' && renderCategoryTab()}
                    {activeTab === 'notes' && renderNotesTab()}
                </div>

                {/* Footer */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Save size={18} />
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            {showCategoryManager && (
                <CategoryManager
                    onClose={() => {
                        setShowCategoryManager(false);
                        getCategories().then(data => {
                            setCategories(data);
                            // If the current category was deleted, clear it locally
                            if (formData.category_id && !data.find(c => c.id === Number(formData.category_id))) {
                                handleChange('category_id', '');
                            }
                        }).catch(console.error);
                    }}
                />
            )}
        </div>
    );
};

export default ItemMetadataEditor;
