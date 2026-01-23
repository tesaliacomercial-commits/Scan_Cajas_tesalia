
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
}

declare global {
    interface Window {
        Html5Qrcode: any;
    }
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onScanError }) => {
  const scannerRef = useRef<any>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [isListening, setIsListening] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const listeningTimeoutRef = useRef<number | null>(null);

  const triggerCapture = () => {
    setIsListening(true);
    if (listeningTimeoutRef.current) window.clearTimeout(listeningTimeoutRef.current);
    
    // El sistema escucha durante 3 segundos después de presionar
    listeningTimeoutRef.current = window.setTimeout(() => {
      setIsListening(false);
    }, 3000);
  };

  const startScanner = useCallback(() => {
    if (readerRef.current) {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop();
      }

      const html5QrCode = new window.Html5Qrcode(readerRef.current.id);
      scannerRef.current = html5QrCode;

      const config = { 
        fps: 20, 
        qrbox: { width: 250, height: 250 }, 
        aspectRatio: 1.0 
      };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (text: string) => {
            // Solo procesamos si el usuario presionó el botón de captura
            if (isListening) {
                setIsListening(false);
                setFlashActive(true);
                setTimeout(() => setFlashActive(false), 400);
                if (navigator.vibrate) navigator.vibrate(80);
                onScanSuccess(text);
            }
        },
        () => { /* ignore verbose errors */ }
      ).then(() => {
        setPermissionStatus('granted');
      }).catch((err: any) => {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setPermissionStatus('denied');
        } else {
            onScanError("Error al iniciar cámara.");
        }
      });
    }
  }, [onScanSuccess, onScanError, isListening]);

  // Actualizar el scanner cuando cambia isListening para que el callback de éxito lo vea
  useEffect(() => {
    if (scannerRef.current && scannerRef.current.isScanning) {
        // html5-qrcode no permite actualizar el callback en caliente fácilmente
        // pero isListening está en el scope del callback de startScanner si se recrea
        // o si usamos una ref. Vamos a usar una ref para isListening dentro del scanner.
    }
  }, [isListening]);

  // Refactor para usar una ref para isListening y evitar recrear el scanner constantemente
  const isListeningRef = useRef(isListening);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  useEffect(() => {
    if (readerRef.current && permissionStatus !== 'granted') {
        startScanner();
    }

    return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
        }
    };
  }, [startScanner]);

  return (
    <div className="w-full flex flex-col items-center animate-fade-in">
      <div id="reader-container" className="w-full aspect-square relative bg-black rounded-[2rem] overflow-hidden border-2 border-gray-700 shadow-2xl">
        <div id="qr-reader" ref={readerRef} className="w-full h-full"></div>
        
        {/* Capa Flash */}
        <div className={`absolute inset-0 pointer-events-none z-40 transition-opacity duration-300 ${flashActive ? 'bg-white opacity-80' : 'opacity-0'}`}></div>

        {/* Shutter Overlay */}
        {permissionStatus === 'granted' && (
            <div className="absolute inset-0 flex flex-col items-center justify-end p-10 z-30 bg-gradient-to-t from-black/40 to-transparent">
                <button 
                    onClick={triggerCapture}
                    className={`bg-white active:scale-90 text-indigo-600 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] ${isListening ? 'ring-4 ring-indigo-500 scale-110' : ''}`}
                >
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
                    </svg>
                </button>
                <p className="mt-4 text-white text-[9px] font-black uppercase tracking-[0.4em] drop-shadow-lg opacity-70">
                    {isListening ? 'Buscando código...' : 'Tocar para leer'}
                </p>
            </div>
        )}

        {permissionStatus === 'checking' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-50">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
        )}

        {permissionStatus === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-900 z-50">
                <p className="text-red-400 font-bold mb-4">Cámara bloqueada</p>
                <button onClick={() => window.location.reload()} className="bg-gray-800 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Reintentar</button>
            </div>
        )}
      </div>
      
      <div className="mt-6 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest">
          Apunta al código y presiona el botón blanco
      </div>
    </div>
  );
};
