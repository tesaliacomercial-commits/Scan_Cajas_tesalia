
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
  const baseClasses = 'p-4 rounded-md text-center font-semibold mb-4 text-lg animate-in fade-in duration-300';
  const typeClasses = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white',
  };
  return <div className={`${baseClasses} ${typeClasses[type]}`}>{children}</div>;
};

/**
 * Utility to safely extract a string ID from Airtable field values.
 * Handles strings, numbers, arrays (lookups), or objects.
 */
const formatBoxId = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return formatBoxId(value[0]); // Recursive call for first item in lookup
  if (typeof value === 'object') {
    // If it's an object, try common properties or just stringify it
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
    setMessage({ text: `Buscando caja: ${boxId}...`, type: 'info' });
    setFoundRecord(null);

    try {
      const record = await findRecordByBoxId(credentials, boxId);
      if (record) {
        if (record.fields.Status_arribo) {
          setMessage({ text: `La caja ${boxId} ya fue ingresada.`, type: 'warning' });
        } else {
          setMessage({ text: `Caja encontrada: ${formatBoxId(record.fields.ID_Caja)}`, type: 'success' });
          setFoundRecord(record);
        }
      } else {
        setMessage({ text: `ID '${boxId}' no encontrado. Verifica si está escrito correctamente o si ya fue ingresada.`, type: 'error' });
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
    setMessage({ text: `Confirmando ingreso de ${boxId}...`, type: 'info' });
    try {
        await updateRecordStatus(credentials, foundRecord.id);
        setMessage({ text: `¡Caja ${boxId} ingresada con éxito!`, type: 'success' });
        setFoundRecord(null);
        refreshSuggestions();
    } catch (error: any) {
        setMessage({ text: `Error al confirmar: ${error.message}`, type: 'error' });
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

  const handleSuggestionClick = (record: AirtableRecord) => {
      const id = formatBoxId(record.fields.ID_Caja);
      setManualId(id);
      handleSearch(id);
  };

  const refreshSuggestions = useCallback(async () => {
    if (mode !== 'manual') return;
    setSuggestionsLoading(true);
    try {
      const results = await searchRecordsByBoxIdPrefix(credentials, manualId);
      setSuggestions(results);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
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
    <div className="min-h-screen bg-gray-900 flex flex-col p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Logística Bodega</h1>
            <button
              onClick={onClearConfig}
              className="bg-gray-800 hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-all py-2 px-4 rounded-lg text-xs border border-gray-700"
            >
                Cambiar Base
            </button>
        </header>

        <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-6 flex-grow flex flex-col border border-gray-700">
            <div className="flex bg-gray-900/50 p-1 rounded-lg mb-6 border border-gray-700">
                <button onClick={() => { resetState(); setMode('scanner'); }} className={`flex-1 py-3 text-lg font-semibold rounded-md transition-all ${mode === 'scanner' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                    Cámara
                </button>
                <button onClick={() => { resetState(); setMode('manual'); }} className={`flex-1 py-3 text-lg font-semibold rounded-md transition-all ${mode === 'manual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                    Lista Manual
                </button>
            </div>
            
            <div className="flex-grow flex flex-col">
                <div>
                    {message && <Message type={message.type}>{message.text}</Message>}

                    {mode === 'scanner' && scannerActive && (
                        <Scanner onScanSuccess={(decodedText) => handleSearch(decodedText)} onScanError={(error) => setMessage({ text: error, type: 'error' })} />
                    )}

                    {mode === 'manual' && !foundRecord && (
                        <div className="flex flex-col h-full">
                            <form onSubmit={handleManualSubmit} className="mb-6">
                                <label htmlFor="manual-id" className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">Buscar por Código</label>
                                <div className="flex gap-2">
                                    <input 
                                        id="manual-id"
                                        type="text"
                                        value={manualId}
                                        onChange={handleManualIdChange}
                                        placeholder="Escribe para filtrar..."
                                        autoComplete="off"
                                        className="flex-grow bg-gray-900 border border-gray-700 text-white rounded-lg shadow-inner p-4 text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                    <button type="submit" disabled={isLoading || !manualId.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:bg-gray-700 disabled:text-gray-500 transition-colors shadow-lg">
                                        Buscar
                                    </button>
                                </div>
                            </form>

                            <div className="flex-grow bg-gray-900 rounded-lg border border-gray-700 overflow-hidden flex flex-col min-h-[300px]">
                                <div className="p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        Disponibles 
                                        {!suggestionsLoading && <span className="bg-indigo-900 text-indigo-200 text-xs px-2 py-0.5 rounded-full">{suggestions.length}</span>}
                                    </h3>
                                    <button 
                                      onClick={refreshSuggestions} 
                                      className="text-indigo-400 hover:text-indigo-300 text-sm font-bold flex items-center gap-1"
                                      disabled={suggestionsLoading}
                                    >
                                      {suggestionsLoading ? '...' : '↻ Actualizar'}
                                    </button>
                                </div>
                                <div className="overflow-auto max-h-[400px]">
                                    {suggestionsLoading && suggestions.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                            <p className="text-gray-500">Cargando lista...</p>
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        <ul className="divide-y divide-gray-800">
                                            {suggestions.map(record => (
                                                <li 
                                                    key={record.id} 
                                                    onClick={() => handleSuggestionClick(record)}
                                                    className="p-4 text-white hover:bg-indigo-600/30 active:bg-indigo-600 transition-colors cursor-pointer flex justify-between items-center group"
                                                >
                                                    <span className="text-lg font-medium">{formatBoxId(record.fields.ID_Caja)}</span>
                                                    <span className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-all text-sm font-bold">SELECCIONAR →</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="p-12 text-center">
                                            <p className="text-gray-500 text-lg">
                                                {manualId.trim() ? "No hay coincidencias." : "No se encontraron cajas pendientes."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 space-y-4">
                    {foundRecord && (
                        <div className="bg-green-900/20 border border-green-700/50 p-6 rounded-xl text-center animate-in zoom-in duration-300">
                           <p className="text-green-400 text-xs uppercase tracking-widest mb-1 font-bold">Caja lista para ingresar</p>
                           <h2 className="text-4xl font-black text-white mb-6 tracking-tight">{formatBoxId(foundRecord.fields.ID_Caja)}</h2>
                           <button onClick={handleConfirm} disabled={isLoading} className="w-full py-5 px-4 rounded-xl shadow-xl text-xl font-black text-white bg-green-600 hover:bg-green-500 transition-all transform active:scale-95 disabled:bg-gray-700 uppercase tracking-wide">
                               {isLoading ? 'Guardando...' : 'CONFIRMAR ARRIBO'}
                           </button>
                        </div>
                    )}

                    {!scannerActive && (
                        <button onClick={resetState} className="w-full py-4 px-4 border border-gray-700 rounded-xl text-lg font-bold text-gray-500 bg-gray-900 hover:bg-gray-800 transition-colors uppercase tracking-widest">
                            ← Volver a la Lista
                        </button>
                    )}
                </div>
            </div>
        </div>
        <footer className="mt-6 text-center text-gray-700 text-[10px] uppercase tracking-[0.2em] font-bold">
            Airtable Connector • v2.2
        </footer>
    </div>
  );
};
