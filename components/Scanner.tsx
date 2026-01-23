
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
}

// Define the type for the html5-qrcode library if it's not globally available
declare global {
    interface Window {
        Html5Qrcode: any;
    }
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onScanError }) => {
  const scannerRef = useRef<any>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');

  const startScanner = useCallback(() => {
    if (readerRef.current) {
      // Ensure we have a fresh instance if we're retrying
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop();
      }

      const html5QrCode = new window.Html5Qrcode(readerRef.current.id);
      scannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        () => { /* ignore verbose errors */ }
      ).then(() => {
        setPermissionStatus('granted');
      }).catch((err: any) => {
        console.error("Scanner start failed:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setPermissionStatus('denied');
        } else {
            onScanError("No se pudo iniciar la cámara. Intenta recargar la página.");
        }
      });
    }
  }, [onScanSuccess, onScanError]);

  useEffect(() => {
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'camera' as PermissionName }).then((status) => {
            setPermissionStatus(status.state);
            if (status.state === 'granted') {
                startScanner();
            }
            status.onchange = () => {
                setPermissionStatus(status.state);
                if (status.state === 'granted' && !scannerRef.current?.isScanning) {
                    startScanner();
                }
            };
        }).catch(() => {
            setPermissionStatus('prompt');
        });
    } else {
        setPermissionStatus('prompt');
    }

    return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch((err: any) => {
                console.error("Failed to stop scanner on cleanup.", err);
            });
        }
    };
  }, [startScanner]);

  // Unified render logic to ensure the ref is always available
  return (
    <div className="w-full max-w-md mx-auto">
      {/* This div is always rendered so `readerRef` is populated. */}
      {/* Styles are applied only when the scanner is active. */}
      <div id="qr-reader" ref={readerRef} className={permissionStatus === 'granted' ? 'border-2 border-dashed border-gray-600 rounded-lg overflow-hidden bg-gray-900' : ''}></div>

      {permissionStatus === 'checking' && (
        <div className="text-center p-4 text-gray-400">Verificando permisos de la cámara...</div>
      )}

      {permissionStatus === 'denied' && (
        <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="font-bold text-white text-lg">Acceso a la cámara denegado</p>
          <p className="text-red-200 mt-2">
            Para escanear, necesitas habilitar el permiso de la cámara para este sitio en la configuración de tu navegador.
          </p>
        </div>
      )}

      {permissionStatus === 'prompt' && (
        <div className="text-center p-4 flex flex-col items-center">
          <p className="mb-4 text-gray-300">Se necesita acceso a la cámara para poder escanear.</p>
          <button
            onClick={startScanner}
            className="w-full max-w-xs py-4 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Activar Cámara
          </button>
        </div>
      )}
      
      {permissionStatus === 'granted' && (
         <p className="text-center text-gray-400 mt-2">Apunta la cámara al código de barras</p>
      )}
    </div>
  );
};
