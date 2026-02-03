import React, { useState, useEffect, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Package, Box, Home, DollarSign, Tag, User, Book, Gamepad2, Laptop, ChevronRight, Shield, MapPin } from 'lucide-react';
import type { Item, Container, Space, Category } from '../services/api';
import { getItem, getInventory, getCategories } from '../services/api';

interface ScanResult {
    type: 'item' | 'container' | 'space';
    data: Item | Container | Space | null;
    items?: Item[];  // For containers
    containers?: Container[];  // For spaces
}

interface Props {
    onSelectItem?: (item: Item) => void;
}

const ScannerView: React.FC<Props> = ({ onSelectItem }) => {
    const [scanning, setScanning] = useState(true);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getCategories().then(setCategories).catch(console.error);
    }, []);

    const parseQRCode = (code: string): { type: 'item' | 'container' | 'space'; id: string } | null => {
        // Formats:
        // cec:ID:Name (item)
        // cec:item:ID:Name
        // cec:container:ID:Name
        // cec:space:ID:Name
        // item:ID (legacy)
        // container:ID
        // space:ID

        if (code.startsWith('cec:')) {
            const parts = code.split(':');
            if (parts.length >= 3) {
                if (parts[1] === 'item' || parts[1] === 'container' || parts[1] === 'space') {
                    return { type: parts[1] as any, id: parts[2] };
                } else {
                    // Default: cec:ID:Name = item
                    return { type: 'item', id: parts[1] };
                }
            } else if (parts.length === 2 && !isNaN(Number(parts[1]))) {
                return { type: 'item', id: parts[1] };
            }
        } else if (code.startsWith('item:')) {
            return { type: 'item', id: code.replace('item:', '') };
        } else if (code.startsWith('container:')) {
            return { type: 'container', id: code.replace('container:', '') };
        } else if (code.startsWith('space:')) {
            return { type: 'space', id: code.replace('space:', '') };
        } else if (!isNaN(Number(code))) {
            return { type: 'item', id: code };
        }
        return null;
    };

    const handleScan = useCallback(async (code: string) => {
        setScanning(false);
        setError(null);

        const parsed = parseQRCode(code);
        if (!parsed) {
            setError(`Código QR no reconocido: ${code}`);
            return;
        }

        try {
            const inventory = await getInventory();

            if (parsed.type === 'item') {
                const item = await getItem(parsed.id);
                setResult({ type: 'item', data: item });
            } else if (parsed.type === 'container') {
                // Find container and its items
                for (const space of inventory) {
                    const container = space.containers.find(c => c.id === Number(parsed.id));
                    if (container) {
                        setResult({ type: 'container', data: container, items: container.items });
                        return;
                    }
                }
                setError('Contenedor no encontrado');
            } else if (parsed.type === 'space') {
                const space = inventory.find(s => s.id === Number(parsed.id));
                if (space) {
                    setResult({ type: 'space', data: space, containers: space.containers });
                } else {
                    setError('Espacio no encontrado');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Error al buscar el elemento');
        }
    }, []);

    const resetScanner = () => {
        setResult(null);
        setError(null);
        setScanning(true);
    };

    const getCategoryName = (categoryId?: number) => {
        if (!categoryId) return null;
        const cat = categories.find(c => c.id === categoryId);
        return cat?.name || null;
    };

    const formatDate = (date?: string) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatPrice = (price?: number) => {
        if (price === undefined || price === null) return null;
        return `${price.toFixed(2)} €`;
    };

    const renderItemDetails = (item: Item) => {
        const categoryName = getCategoryName(item.category_id);

        return (
            <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                    {item.photo_url && (
                        <img src={item.photo_url} alt={item.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '8px' }} />
                    )}
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.3em' }}>{item.name}</h2>
                        {categoryName && (
                            <span style={{ display: 'inline-block', background: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75em', marginTop: '4px' }}>
                                {categoryName}
                            </span>
                        )}
                    </div>
                </div>

                {item.description && (
                    <p style={{ opacity: 0.8, marginBottom: '1rem' }}>{item.description}</p>
                )}

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '1rem' }}>
                    <div className="card" style={{ padding: '10px', background: 'var(--glass-bg)' }}>
                        <div style={{ fontSize: '0.75em', opacity: 0.7 }}>Cantidad</div>
                        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{item.quantity}</div>
                    </div>
                    {item.condition && (
                        <div className="card" style={{ padding: '10px', background: 'var(--glass-bg)' }}>
                            <div style={{ fontSize: '0.75em', opacity: 0.7 }}>Estado</div>
                            <div>{{
                                'nuevo': '✨ Nuevo',
                                'buen_estado': '👍 Buen estado',
                                'usado': '📦 Usado',
                                'dañado': '⚠️ Dañado'
                            }[item.condition] || item.condition}</div>
                        </div>
                    )}
                </div>

                {/* Details sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Brand/Model */}
                    {(item.brand || item.model) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <Tag size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Marca/Modelo:</span>
                            <span>{[item.brand, item.model].filter(Boolean).join(' ')}</span>
                        </div>
                    )}

                    {/* Serial */}
                    {item.serial_number && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <Tag size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Nº Serie:</span>
                            <span style={{ fontFamily: 'monospace' }}>{item.serial_number}</span>
                        </div>
                    )}

                    {/* Purchase */}
                    {(item.purchase_date || item.purchase_price) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <DollarSign size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Compra:</span>
                            <span>
                                {formatPrice(item.purchase_price)}
                                {item.purchase_date && ` (${formatDate(item.purchase_date)})`}
                            </span>
                        </div>
                    )}

                    {item.purchase_location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <MapPin size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Tienda:</span>
                            <span>{item.purchase_location}</span>
                        </div>
                    )}

                    {/* Warranty */}
                    {(item.warranty_months || item.warranty_end) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <Shield size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Garantía:</span>
                            <span>
                                {item.warranty_months && `${item.warranty_months} meses`}
                                {item.warranty_end && ` (hasta ${formatDate(item.warranty_end)})`}
                            </span>
                        </div>
                    )}

                    {/* Book fields */}
                    {item.book_author && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <Book size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Autor:</span>
                            <span>{item.book_author}</span>
                        </div>
                    )}
                    {item.book_pages && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <Book size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Páginas:</span>
                            <span>{item.book_pages}</span>
                        </div>
                    )}
                    {item.book_isbn && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <Book size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>ISBN:</span>
                            <span style={{ fontFamily: 'monospace' }}>{item.book_isbn}</span>
                        </div>
                    )}

                    {/* Game fields */}
                    {item.game_platform && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <Gamepad2 size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Plataforma:</span>
                            <span>{item.game_platform}</span>
                        </div>
                    )}
                    {item.game_developer && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <Gamepad2 size={16} opacity={0.7} />
                            <span style={{ opacity: 0.7 }}>Desarrollador:</span>
                            <span>{item.game_developer}</span>
                        </div>
                    )}

                    {/* Tech fields */}
                    {item.tech_specs && (
                        <div style={{ padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <Laptop size={16} opacity={0.7} />
                                <span style={{ opacity: 0.7 }}>Especificaciones:</span>
                            </div>
                            <pre style={{ margin: 0, fontSize: '0.85em', whiteSpace: 'pre-wrap', opacity: 0.9 }}>{item.tech_specs}</pre>
                        </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                        <div style={{ padding: '8px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <User size={16} opacity={0.7} />
                                <span style={{ opacity: 0.7 }}>Notas:</span>
                            </div>
                            <p style={{ margin: 0, opacity: 0.9 }}>{item.notes}</p>
                        </div>
                    )}
                </div>

                {onSelectItem && (
                    <button onClick={() => onSelectItem(item)} style={{ width: '100%', marginTop: '1rem', background: 'var(--primary)' }}>
                        Ver detalles completos
                    </button>
                )}
            </div>
        );
    };

    const renderContainerDetails = (container: Container, items?: Item[]) => (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <div style={{ width: 60, height: 60, background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box size={30} />
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '1.3em' }}>{container.name}</h2>
                    <span style={{ opacity: 0.7, fontSize: '0.9em' }}>Contenedor</span>
                </div>
            </div>

            {container.description && (
                <p style={{ opacity: 0.8, marginBottom: '1rem' }}>{container.description}</p>
            )}

            <div className="card" style={{ padding: '12px', background: 'var(--glass-bg)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85em', opacity: 0.7 }}>Objetos en este contenedor</div>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{items?.length || 0}</div>
            </div>

            {items && items.length > 0 && (
                <div>
                    <h4 style={{ margin: '0 0 10px' }}>Contenido:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map(item => (
                            <div
                                key={item.id}
                                className="card"
                                style={{ padding: '10px', background: 'var(--glass-bg)', cursor: onSelectItem ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '10px' }}
                                onClick={() => onSelectItem?.(item)}
                            >
                                {item.photo_url ? (
                                    <img src={item.photo_url} alt={item.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '6px' }} />
                                ) : (
                                    <Package size={24} opacity={0.5} />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                                    <div style={{ fontSize: '0.8em', opacity: 0.7 }}>x{item.quantity}</div>
                                </div>
                                {onSelectItem && <ChevronRight size={18} opacity={0.5} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderSpaceDetails = (space: Space, containers?: Container[]) => (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <div style={{ width: 60, height: 60, background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Home size={30} />
                </div>
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '1.3em' }}>{space.name}</h2>
                    <span style={{ opacity: 0.7, fontSize: '0.9em' }}>Habitación / Espacio</span>
                </div>
            </div>

            {space.description && (
                <p style={{ opacity: 0.8, marginBottom: '1rem' }}>{space.description}</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '1rem' }}>
                <div className="card" style={{ padding: '12px', background: 'var(--glass-bg)' }}>
                    <div style={{ fontSize: '0.85em', opacity: 0.7 }}>Contenedores</div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{containers?.length || 0}</div>
                </div>
                <div className="card" style={{ padding: '12px', background: 'var(--glass-bg)' }}>
                    <div style={{ fontSize: '0.85em', opacity: 0.7 }}>Total objetos</div>
                    <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{containers?.reduce((sum, c) => sum + (c.items?.length || 0), 0) || 0}</div>
                </div>
            </div>

            {containers && containers.length > 0 && (
                <div>
                    <h4 style={{ margin: '0 0 10px' }}>Contenedores:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {containers.map(container => (
                            <div key={container.id} className="card" style={{ padding: '10px', background: 'var(--glass-bg)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Box size={24} opacity={0.7} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500 }}>{container.name}</div>
                                        <div style={{ fontSize: '0.8em', opacity: 0.7 }}>{container.items?.length || 0} objetos</div>
                                    </div>
                                </div>
                                {container.items && container.items.length > 0 && (
                                    <div style={{ marginTop: '8px', paddingLeft: '34px', fontSize: '0.85em', opacity: 0.7 }}>
                                        {container.items.slice(0, 3).map(item => item.name).join(', ')}
                                        {container.items.length > 3 && ` +${container.items.length - 3} más`}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>📱 Escanear QR</h2>
                {!scanning && (
                    <button onClick={resetScanner} style={{ padding: '8px 16px', fontSize: '0.9em' }}>
                        Escanear otro
                    </button>
                )}
            </div>

            {scanning && (
                <>
                    <p style={{ fontSize: '0.85em', opacity: 0.7, marginBottom: '1rem' }}>
                        Escanea un QR de objeto, contenedor o habitación para ver todos sus datos.
                    </p>
                    <ScannerCore onScan={handleScan} />
                </>
            )}

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ margin: 0 }}>{error}</p>
                    <button onClick={resetScanner} style={{ marginTop: '1rem' }}>Intentar de nuevo</button>
                </div>
            )}

            {result && (
                <div style={{ marginTop: scanning ? '1rem' : 0 }}>
                    {result.type === 'item' && result.data && renderItemDetails(result.data as Item)}
                    {result.type === 'container' && result.data && renderContainerDetails(result.data as Container, result.items)}
                    {result.type === 'space' && result.data && renderSpaceDetails(result.data as Space, result.containers)}
                </div>
            )}
        </div>
    );
};

// Internal scanner component
const ScannerCore: React.FC<{ onScan: (code: string) => void }> = ({ onScan }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        scanner.render(
            (decodedText) => {
                onScan(decodedText);
                scanner.clear().catch(console.error);
            },
            () => { /* Ignore scan failures */ }
        );

        return () => {
            scanner.clear().catch(console.error);
        };
    }, [onScan]);

    return <div id="qr-reader" style={{ width: '100%' }} />;
};

export default ScannerView;
