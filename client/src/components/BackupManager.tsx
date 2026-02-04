import React, { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { exportData, importData } from '../services/api';

const BackupManager: React.FC = () => {
    const [isImporting, setIsImporting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

    const handleExport = async () => {
        try {
            setStatus({ type: 'info', message: 'Generando backup...' });
            await exportData();
            setStatus({ type: 'success', message: 'Backup exportado correctamente' });
            setTimeout(() => setStatus(null), 3000);
        } catch (error) {
            console.error('Export error:', error);
            setStatus({ type: 'error', message: 'Error al exportar el backup' });
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm('¿Estás seguro de que quieres importar este backup? Se sobrescribirán todos los datos actuales.')) {
            event.target.value = '';
            return;
        }

        setIsImporting(true);
        setStatus({ type: 'info', message: 'Importando datos...' });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                await importData(json);
                setStatus({ type: 'success', message: 'Datos importados correctamente. Recargando...' });
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } catch (error: any) {
                console.error('Import error:', error);
                setStatus({ type: 'error', message: 'Error al importar: ' + (error.response?.data?.error || error.message) });
                setIsImporting(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="backup-manager glass-panel p-4 rounded-xl mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-400" />
                Copia de Seguridad
            </h3>

            <div className="flex flex-wrap gap-4">
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-all text-sm"
                >
                    <Download className="w-4 h-4" />
                    Exportar JSON
                </button>

                <div className="relative">
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isImporting}
                    />
                    <button
                        className={`flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-all text-sm ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Importar JSON
                    </button>
                </div>
            </div>

            {status && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${status.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                        status.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                    {status.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {status.type === 'error' && <AlertCircle className="w-4 h-4" />}
                    {status.type === 'info' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {status.message}
                </div>
            )}

            <p className="mt-3 text-xs text-gray-400 italic">
                * La importación borrará el inventario actual y lo reemplazará por el contenido del archivo.
            </p>
        </div>
    );
};

export default BackupManager;
