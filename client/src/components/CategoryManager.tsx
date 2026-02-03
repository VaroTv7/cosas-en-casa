import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Package, Book, Gamepad2, Laptop, Shirt, Hammer, Palette, Smartphone, Home, Coffee, Briefcase } from 'lucide-react';
import type { Category } from '../services/api';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';

const ICONS = [
    { name: 'package', icon: <Package size={20} /> },
    { name: 'book', icon: <Book size={20} /> },
    { name: 'gamepad2', icon: <Gamepad2 size={20} /> },
    { name: 'laptop', icon: <Laptop size={20} /> },
    { name: 'shirt', icon: <Shirt size={20} /> },
    { name: 'hammer', icon: <Hammer size={20} /> },
    { name: 'palette', icon: <Palette size={20} /> },
    { name: 'smartphone', icon: <Smartphone size={20} /> },
    { name: 'home', icon: <Home size={20} /> },
    { name: 'coffee', icon: <Coffee size={20} /> },
    { name: 'briefcase', icon: <Briefcase size={20} /> }
];

const COLORS = ['#6b7280', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const CategoryManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isEditing, setIsEditing] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('package');
    const [color, setColor] = useState('#6b7280');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        if (!name) return alert('Nombre requerido');
        setLoading(true);
        try {
            if (isEditing) {
                await updateCategory(isEditing, { name, icon, color });
            } else {
                await createCategory({ name, icon, color });
            }
            setName('');
            setIcon('package');
            setColor('#6b7280');
            setIsEditing(null);
            loadCategories();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (cat: Category) => {
        setIsEditing(cat.id);
        setName(cat.name);
        setIcon(cat.icon || 'package');
        setColor(cat.color || '#6b7280');
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta categoría?')) return;
        try {
            await deleteCategory(id);
            loadCategories();
        } catch (err: any) {
            alert(err?.response?.data?.error || 'Error al eliminar');
        }
    };

    const renderIcon = (iconName?: string) => {
        const found = ICONS.find(i => i.name === iconName);
        return found ? found.icon : <Package size={20} />;
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem', boxSizing: 'border-box'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Gestionar Categorías</h3>
                    <button onClick={onClose} style={{ background: 'transparent' }}><X size={24} /></button>
                </div>

                {/* Form */}
                <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem border: 1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input
                            type="text"
                            placeholder="Nombre de categoría"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ flex: 1, padding: '10px' }}
                        />
                        <button onClick={handleSave} disabled={loading} style={{ background: 'var(--primary)' }}>
                            {isEditing ? <Save size={20} /> : <Plus size={20} />}
                        </button>
                        {isEditing && (
                            <button onClick={() => { setIsEditing(null); setName(''); }} style={{ background: 'var(--glass-border)' }}>
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '10px' }}>
                        {ICONS.map(i => (
                            <button
                                key={i.name}
                                onClick={() => setIcon(i.name)}
                                style={{
                                    padding: '8px',
                                    background: icon === i.name ? 'var(--primary)' : 'var(--glass-bg)',
                                    borderRadius: '6px'
                                }}
                                type="button"
                            >
                                {i.icon}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                        {COLORS.map(c => (
                            <div
                                key={c}
                                onClick={() => setColor(c)}
                                style={{
                                    width: '24px', height: '24px', borderRadius: '50%',
                                    background: c, cursor: 'pointer',
                                    border: color === c ? '2px solid white' : 'none'
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div style={{ padding: '0.8rem 1rem', fontSize: '0.8em', opacity: 0.7, borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem', background: 'rgba(255,255,255,0.02)' }}>
                    ✨ Elige un icono y color para identificar tus cosas. Haz clic en el 🗑️ para borrar o en el 📝 para renombrar.
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {categories.map(cat => (
                            <div key={cat.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px', background: 'var(--glass-bg)', borderRadius: '8px'
                            }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: cat.color || '#6b7280', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {renderIcon(cat.icon)}
                                </div>
                                <div style={{ flex: 1, fontWeight: 'bold' }}>{cat.name}</div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => handleEdit(cat)} style={{ padding: '6px', background: 'var(--secondary)' }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id)} style={{ padding: '6px', background: '#ef4444' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <button
                        onClick={onClose}
                        style={{ width: '100%', background: 'var(--primary)', padding: '12px', fontWeight: 'bold', borderRadius: '8px' }}
                    >
                        Hecho
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryManager;
