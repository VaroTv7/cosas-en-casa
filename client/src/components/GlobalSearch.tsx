import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Box, Home, User, ChevronRight } from 'lucide-react';
import { searchGlobal } from '../services/api';
import type { SearchResults } from '../services/api';

interface GlobalSearchProps {
    onNavigate: (type: 'items' | 'containers' | 'spaces' | 'people', id: number) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // De-bounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    const data = await searchGlobal(query);
                    setResults(data);
                    setIsOpen(true);
                } catch (error) {
                    console.error('Search error:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults(null);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Handle click outside to close
    const wrapperRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (type: any, id: number) => {
        setIsOpen(false);
        setQuery('');
        onNavigate(type, id);
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                backdropFilter: 'blur(10px)',
                boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.2s'
            }}>
                <Search size={20} style={{ opacity: 0.5, marginRight: '10px' }} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar objetos, cajas o lugares..."
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '1em',
                        width: '100%',
                        outline: 'none'
                    }}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                {query && (
                    <button onClick={() => { setQuery(''); setIsOpen(false); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.5 }}>
                        <X size={18} />
                    </button>
                )}
            </div>

            {isOpen && results && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    marginTop: '8px',
                    background: 'var(--surface)',  // Fallback if var not defined: #1a1a2e
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    zIndex: 2000,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    padding: '8px'
                }}>
                    {loading && <div style={{ padding: '16px', textAlign: 'center', opacity: 0.7 }}>Buscando...</div>}

                    {!loading && (
                        results.items.length === 0 &&
                        results.containers.length === 0 &&
                        results.spaces.length === 0 &&
                        results.people.length === 0
                    ) && (
                            <div style={{ padding: '16px', textAlign: 'center', opacity: 0.7 }}>No se encontraron resultados</div>
                        )}

                    <ResultGroup
                        title="Objetos"
                        items={results.items}
                        icon={<Package size={14} />}
                        onSelect={(id) => handleSelect('items', id)}
                    />

                    <ResultGroup
                        title="Contenedores"
                        items={results.containers}
                        icon={<Box size={14} />}
                        onSelect={(id) => handleSelect('containers', id)}
                    />

                    <ResultGroup
                        title="Espacios"
                        items={results.spaces}
                        icon={<Home size={14} />}
                        onSelect={(id) => handleSelect('spaces', id)}
                    />

                    <ResultGroup
                        title="Personas"
                        items={results.people}
                        icon={<User size={14} />}
                        onSelect={(id) => handleSelect('people', id)}
                    />
                </div>
            )}
        </div>
    );
};

const ResultGroup = ({ title, items, icon, onSelect }: { title: string, items: any[], icon: React.ReactNode, onSelect: (id: number) => void }) => {
    if (!items || items.length === 0) return null;
    return (
        <div style={{ marginBottom: '8px' }}>
            <div style={{
                padding: '8px 12px',
                fontSize: '0.8em',
                fontWeight: 'bold',
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex', alignItems: 'center', gap: '6px'
            }}>
                {icon} {title}
            </div>
            {items.map((item: any) => (
                <div
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'transparent',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div>
                        <div style={{ fontWeight: '500' }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: '0.8em', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{item.description}</div>}
                        {item.container_name && <div style={{ fontSize: '0.75em', opacity: 0.5 }}>📦 {item.container_name}</div>}
                    </div>
                    <ChevronRight size={16} style={{ opacity: 0.3 }} />
                </div>
            ))}
        </div>
    );
};

export default GlobalSearch;
