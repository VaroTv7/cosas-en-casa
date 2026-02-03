import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Props {
    onScan: (decodedText: string) => void;
}

const Scanner = ({ onScan }: Props) => {
    const [scanResult, setScanResult] = useState<string | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);

        function onScanSuccess(decodedText: string) {
            setScanResult(decodedText);
            onScan(decodedText);
            scanner.clear();
        }

        function onScanFailure() {
            // console.warn(`Scan error: ${error}`);
        }

        return () => {
            scanner.clear().catch(err => console.error("Failed to clear scanner", err));
        };
    }, [onScan]);

    return (
        <div className="card">
            <div id="reader" style={{ width: '100%' }}></div>
            {scanResult && <p>Último escaneo: {scanResult}</p>}
        </div>
    );
};

export default Scanner;
