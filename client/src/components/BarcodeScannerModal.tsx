import React from 'react';
import { X, Camera } from 'lucide-react';
import Scanner from './Scanner';

interface Props {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

const BarcodeScannerModal: React.FC<Props> = ({ onScan, onClose }) => {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem', boxSizing: 'border-box'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Camera size={20} color="var(--primary)" />
                        <h3 style={{ margin: 0 }}>Escanear Código</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', padding: '5px' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '1.5rem' }}>
                    Enfoca el código de barras del objeto para capturarlo automáticamente.
                </p>

                <Scanner onScan={(code) => {
                    onScan(code);
                    onClose();
                }} />

                <button
                    onClick={onClose}
                    style={{ width: '100%', marginTop: '1.5rem', background: 'var(--glass-bg)' }}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default BarcodeScannerModal;
