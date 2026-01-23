
import React, { useState, useCallback, useEffect } from 'react';
import { Scanner } from './Scanner';
import { findRecordByBoxId, updateRecordStatus, searchRecordsByBoxIdPrefix } from '../services/airtableService';
import type { AirtableCredentials, AirtableRecord } from '../types';

interface MainScreenProps {
  credentials: AirtableCredentials;
  onClearConfig: () => void;
}

type Mode = 'scanner' | 'manual';

const Message: React.FC<{ type: 'success' | 'error' | 'warning' | 'info'; children: React.ReactNode }> = ({ type, children }) => {
  const baseClasses = 'p-4 rounded-xl text-center font-bold mb-4 text-xs uppercase tracking-widest animate-in fade-in duration-300 shadow-lg';
  const typeClasses = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-indigo-600 text-white',
  };
  return <div className={`${baseClasses} ${typeClasses[type]}`}>{children}</div>;
};

/**
 * Utility to safely extract a string ID from Airtable field values.
 */
const formatBoxId = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return formatBoxId(value[0]);
  if (typeof value === 'object') {
    return value.name || value.text || value.value || String(value);
  }
  return String(value);
};

export const MainScreen: React.FC<MainScreenProps> = ({ credentials, onClearConfig }) => {
  const [mode, setMode] = useState<Mode>('scanner');
  const [manualId, setManualId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [foundRecord, setFoundRecord] = useState<AirtableRecord | null>(null);
  const [scannerActive, setScannerActive] = useState(true);
  const [suggestions, setSuggestions] = useState<AirtableRecord[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const resetState = useCallback(() => {
    setMessage(null);
    setFoundRecord(null);
    setManualId('');
    setScannerActive(true);
  }, []);

  const handleSearch = useCallback(async (boxId: string) => {
    if (!boxId || isLoading) return;

    setIsLoading(true);
    setScannerActive(false);
    setMessage({ text: `Buscando: ${boxId}`, type: 'info' });
    setFoundRecord(null);

    try {
      const record = await findRecordByBoxId(credentials, boxId);
      if (record) {
        if (record.fields.Status_arribo) {
          setMessage({ text: `La caja ${boxId} ya fue ingresada.`, type: 'warning' });
        } else {
          setMessage(null);
          setFoundRecord(record);
        }
      } else {
        setMessage({ text: `ID '${boxId}' no encontrado.`, type: 'error' });
      }
    } catch (error: any) {
        setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [credentials, isLoading]);

  const handleConfirm = async () => {
    if (!foundRecord || isLoading) return;
    setIsLoading(true);
    const boxId = formatBoxId(foundRecord.fields.ID_Caja);
    try {
        await updateRecordStatus(credentials, foundRecord.id);
        setMessage({ text: `¡Caja ${boxId} ingresada!`, type: 'success' });
        setFoundRecord(null);
        setScannerActive(true);
        refreshSuggestions();
    } catch (error: any) {
        setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
        setIsLoading(false);
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      handleSearch(manualId.trim());
    }
  }

  const handleManualIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setManualId(e.target.value);
      setFoundRecord(null);
      if (message) setMessage(null);
  };

  const refreshSuggestions = useCallback(async () => {
    if (mode !== 'manual') return;
    setSuggestionsLoading(true);
    try {
      const results = await searchRecordsByBoxIdPrefix(credentials, manualId);
      setSuggestions(results);
    } catch (error) {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [credentials, manualId, mode]);

  useEffect(() => {
    if (mode === 'manual') {
      const debounceTimer = setTimeout(() => {
        refreshSuggestions();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [manualId, mode, refreshSuggestions]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4">
        <header className="flex justify-between items-center mb-6 max-w-2xl mx-auto w-full px-2">
            <div className="flex flex-col">
                <h1 className="text-2xl font-black tracking-tighter text-white">BODEGA<span className="text-indigo-500">PRO</span></h1>
                <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">Recepción de Arribos</span>
            </div>
            <button
              onClick={onClearConfig}
              className="text-[9px] font-black text-gray-600 hover:text-red-400 uppercase tracking-widest border border-gray-800 px-5 py-2 rounded-full transition-all bg-black/40"
            >
                Salir
            </button>
        </header>

        <main className="w-full max-w-2xl mx-auto bg-gray-800 rounded-[2.5rem] shadow-2xl flex-grow flex flex-col border border-gray-700 overflow-hidden relative">
            <div className="flex bg-gray-900/90 p-1.5 m-3 rounded-[1.5rem] border border-gray-700/50">
                <button onClick={() => { resetState(); setMode('scanner'); }} className={`flex-1 py-3.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${mode === 'scanner' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                    Escanear Cámara
                </button>
                <button onClick={() => { resetState(); setMode('manual'); }} className={`flex-1 py-3.5 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all ${mode === 'manual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                    Lista de Cajas
                </button>
            </div>
            
            <div className="px-6 pb-6 flex-grow flex flex-col">
                <div id="message-container">
                    {message && <Message type={message.type}>{message.text}</Message>}
                </div>

                <div className="flex-grow flex flex-col">
                    {mode === 'scanner' && scannerActive && !foundRecord && (
                        <Scanner onScanSuccess={(decodedText) => handleSearch(decodedText)} onScanError={(error) => setMessage({ text: error, type: 'error' })} />
                    )}

                    {mode === 'manual' && !foundRecord && (
                        <div className="flex flex-col h-full animate-fade-in">
                            <form onSubmit={handleManualSubmit} className="mb-4">
                                <input 
                                    type="text"
                                    value={manualId}
                                    onChange={handleManualIdChange}
                                    placeholder="Buscar ID de caja..."
                                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-2xl p-5 text-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner placeholder-gray-700"
                                />
                            </form>

                            <div className="flex-grow bg-gray-900 rounded-[1.5rem] border border-gray-700 flex flex-col overflow-hidden">
                                <div className="px-6 py-4 bg-gray-800/40 border-b border-gray-700 flex justify-between items-center">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pendientes</h3>
                                    <span className="bg-indigo-600/10 text-indigo-400 text-[10px] px-3 py-1 rounded-full font-black">
                                        {suggestionsLoading ? '...' : suggestions.length}
                                    </span>
                                </div>
                                <div className="overflow-y-auto max-h-[380px] divide-y divide-gray-800/50">
                                    {suggestions.length > 0 ? (
                                        suggestions.map(record => (
                                            <div 
                                                key={record.id} 
                                                onClick={() => handleSearch(formatBoxId(record.fields.ID_Caja))}
                                                className="p-5 hover:bg-indigo-600/10 cursor-pointer flex justify-between items-center transition-all active:bg-indigo-600 group"
                                            >
                                                <span className="font-bold tracking-tight text-white">{formatBoxId(record.fields.ID_Caja)}</span>
                                                <span className="text-indigo-500 font-black text-[9px] uppercase tracking-widest">Ver →</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                            {suggestionsLoading ? "Sincronizando..." : "Sin resultados"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {foundRecord && (
                        <div className="flex-grow flex flex-col justify-center animate-fade-in">
                            <div className="bg-indigo-600/10 border border-indigo-500/30 p-10 rounded-[2.5rem] text-center">
                                <p className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.5em] mb-4">Caja Identificada</p>
                                <h2 className="text-2xl sm:text-3xl font-black text-white mb-10 tracking-tighter break-all">
                                    {formatBoxId(foundRecord.fields.ID_Caja)}
                                </h2>
                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={handleConfirm} 
                                        disabled={isLoading} 
                                        className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-black text-xl rounded-2xl transition-all shadow-xl uppercase tracking-widest active:scale-95 disabled:opacity-50"
                                    >
                                        {isLoading ? 'GUARDANDO...' : 'CONFIRMAR'}
                                    </button>
                                    <button 
                                        onClick={resetState} 
                                        className="w-full py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-gray-300"
                                    >
                                        Volver Atrás
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
        <footer className="mt-4 text-center text-gray-700 text-[8px] uppercase tracking-[0.2em] font-black">
            Airtable Terminal v2.5 • Tap to Scan Ready
        </footer>
    </div>
  );
};
