import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Edit2, Save, User } from 'lucide-react';
import { getPeople, createPerson, updatePerson, deletePerson } from '../services/api';
import type { Person } from '../services/api';

interface Props {
    onClose: () => void;
}

const PeopleManager: React.FC<Props> = ({ onClose }) => {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ name: '', role: 'Amigo', contact_info: '' });
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadPeople();
    }, []);

    const loadPeople = async () => {
        setLoading(true);
        try {
            const data = await getPeople();
            setPeople(data);
        } catch (error) {
            console.error('Error loading people:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await createPerson(editForm);
            setIsCreating(false);
            setEditForm({ name: '', role: 'Amigo', contact_info: '' });
            loadPeople();
        } catch (error) {
            alert('Error al crear persona. ¿Quizás ya existe?');
        }
    };

    const handleUpdate = async (id: number) => {
        try {
            await updatePerson(id, editForm);
            setEditingId(null);
            loadPeople();
        } catch (error) {
            alert('Error al actualizar persona.');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que quieres borrar a esta persona?')) return;
        try {
            await deletePerson(id);
            loadPeople();
        } catch (error) {
            alert('Error al borrar. Puede que tenga cosas prestadas.');
        }
    };

    const startEdit = (person: Person) => {
        setEditingId(person.id);
        setEditForm({ name: person.name, role: person.role || 'Amigo', contact_info: person.contact_info || '' });
    };

    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100
    };

    const modalContentStyle: React.CSSProperties = {
        background: 'var(--surface)', padding: '20px', borderRadius: '12px',
        width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto',
        border: '1px solid var(--border)'
    };

    const inputStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
        padding: '8px', borderRadius: '6px', color: 'white', width: '100%', marginBottom: '8px'
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <User size={24} /> Gestión de Personas
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', padding: '5px' }}><X size={24} /></button>
                </div>

                {!isCreating && !editingId && (
                    <button
                        onClick={() => { setIsCreating(true); setEditForm({ name: '', role: 'Amigo', contact_info: '' }); }}
                        style={{ width: '100%', padding: '10px', background: 'var(--primary)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}
                    >
                        <UserPlus size={18} /> Añadir Nueva Persona
                    </button>
                )}

                {(isCreating || editingId) && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>{isCreating ? 'Nueva Persona' : 'Editar Persona'}</h4>
                        <input
                            placeholder="Nombre"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            style={inputStyle}
                        />
                        <select
                            value={editForm.role}
                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                            style={inputStyle}
                        >
                            <option value="Amigo">Amigo</option>
                            <option value="Familiar">Familiar</option>
                            <option value="Compañero">Compañero</option>
                            <option value="Otro">Otro</option>
                        </select>
                        <input
                            placeholder="Contacto (Tlf/Email)"
                            value={editForm.contact_info}
                            onChange={e => setEditForm({ ...editForm, contact_info: e.target.value })}
                            style={inputStyle}
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                                onClick={() => isCreating ? handleCreate() : handleUpdate(editingId!)}
                                style={{ flex: 1, background: '#10b981', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                            >
                                <Save size={16} /> Guardar
                            </button>
                            <button
                                onClick={() => { setIsCreating(false); setEditingId(null); }}
                                style={{ flex: 1, background: '#ef4444', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {people.map(person => (
                        <div key={person.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '8px' }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{person.name}</div>
                                <div style={{ fontSize: '0.8em', opacity: 0.6 }}>{person.role} • {person.contact_info || 'Sin contacto'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => startEdit(person)} style={{ background: 'transparent', padding: '5px', color: '#fbbf24' }}><Edit2 size={18} /></button>
                                <button onClick={() => handleDelete(person.id)} style={{ background: 'transparent', padding: '5px', color: '#ef4444' }}><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                    {people.length === 0 && !loading && <div style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>No hay personas guardadas.</div>}
                </div>
            </div>
        </div>
    );
};

export default PeopleManager;
