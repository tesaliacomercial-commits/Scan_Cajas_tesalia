
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
  const baseClasses = 'p-4 rounded-md text-center font-semibold mb-4 text-lg';
  const typeClasses = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white',
  };
  return <div className={`${baseClasses} ${typeClasses[type]}`}>{children}</div>;
};


export const MainScreen: React.FC<MainScreenProps> = ({ credentials, onClearConfig }) => {
  const [mode, setMode] = useState<Mode>('scanner');
  const [manualId, setManualId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [foundRecord, setFoundRecord] = useState<AirtableRecord | null>(null);
  const [scannerActive, setScannerActive] = useState(true);
  const [suggestions, setSuggestions] = useState<AirtableRecord[]>([]);

  const resetState = useCallback(() => {
    setMessage(null);
    setFoundRecord(null);
    setManualId('');
    setScannerActive(true);
    setSuggestions([]);
  }, []);

  const handleSearch = useCallback(async (boxId: string) => {
    if (!boxId || isLoading) return;

    setIsLoading(true);
    setScannerActive(false);
    setSuggestions([]);
    setMessage({ text: `Buscando caja: ${boxId}...`, type: 'info' });
    setFoundRecord(null);

    try {
      const record = await findRecordByBoxId(credentials, boxId);
      if (record) {
        if (record.fields.Status_arribo) {
          setMessage({ text: 'Esta caja ya fue ingresada anteriormente.', type: 'warning' });
        } else {
          setMessage({ text: `Caja encontrada: ${record.fields.ID_Caja}`, type: 'success' });
          setFoundRecord(record);
        }
      } else {
        setMessage({ text: 'Caja no encontrada en la base de datos.', type: 'error' });
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
    setMessage({ text: 'Confirmando ingreso...', type: 'info' });
    try {
        const boxId = foundRecord.fields.ID_Caja;
        await updateRecordStatus(credentials, foundRecord.id);
        setMessage({ text: `¡Ingreso de caja ${boxId} confirmado!`, type: 'success' });
        setFoundRecord(null);
    } catch (error: any) {
        setMessage({ text: `Error al confirmar: ${error.message}`, type: 'error' });
    } finally {
        setIsLoading(false);
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(manualId);
  }

  const handleManualIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setManualId(e.target.value);
      setFoundRecord(null);
      if (message) setMessage(null);
  };

  const handleSuggestionClick = (record: AirtableRecord) => {
      setManualId(record.fields.ID_Caja);
      setSuggestions([]);
      handleSearch(record.fields.ID_Caja);
  };

  useEffect(() => {
    if (mode === 'manual' && manualId.trim().length > 1) {
        const debounceTimer = setTimeout(async () => {
            try {
                const results = await searchRecordsByBoxIdPrefix(credentials, manualId);
                const availableBoxes = results.filter(record => !record.fields.Status_arribo);
                setSuggestions(availableBoxes);
            } catch (error) {
                console.error("Failed to fetch suggestions:", error);
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(debounceTimer);
    } else {
        setSuggestions([]);
    }
  }, [manualId, credentials, mode]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Recepción de Bodega</h1>
            <button
              onClick={onClearConfig}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
            >
                Borrar Config.
            </button>
        </header>

        <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-xl p-6 flex-grow flex flex-col">
            <div className="flex border-b border-gray-700 mb-6">
                <button onClick={() => { resetState(); setMode('scanner'); }} className={`flex-1 py-3 text-lg font-semibold rounded-t-lg ${mode === 'scanner' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                    Escanear
                </button>
                <button onClick={() => { resetState(); setMode('manual'); }} className={`flex-1 py-3 text-lg font-semibold rounded-t-lg ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                    Manual
                </button>
            </div>
            
            <div className="flex-grow flex flex-col justify-between">
                <div>
                    {message && <Message type={message.type}>{message.text}</Message>}

                    {mode === 'scanner' && scannerActive && (
                        <Scanner onScanSuccess={(decodedText) => handleSearch(decodedText)} onScanError={(error) => setMessage({ text: error, type: 'error' })} />
                    )}

                    {mode === 'manual' && (
                        <form onSubmit={handleManualSubmit}>
                            <label htmlFor="manual-id" className="block text-sm font-medium text-gray-300 mb-2">ID de Caja Manual</label>
                            <div className="relative">
                                <div className="flex gap-2">
                                    <input 
                                        id="manual-id"
                                        type="text"
                                        value={manualId}
                                        onChange={handleManualIdChange}
                                        placeholder="Ingrese ID de la caja"
                                        autoComplete="off"
                                        className="flex-grow bg-gray-700 border-gray-600 text-white rounded-md shadow-sm p-4 text-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg disabled:bg-gray-500">
                                        {isLoading ? '...' : 'Buscar'}
                                    </button>
                                </div>
                                {suggestions.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-md mt-1 shadow-lg max-h-60 overflow-auto">
                                        {suggestions.map(record => (
                                            <li 
                                                key={record.id} 
                                                onClick={() => handleSuggestionClick(record)}
                                                className="p-3 text-white hover:bg-indigo-500 cursor-pointer"
                                            >
                                                {record.fields.ID_Caja}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </form>
                    )}
                </div>

                <div className="mt-6">
                    {foundRecord && (
                        <button onClick={handleConfirm} disabled={isLoading} className="w-full py-5 px-4 border border-transparent rounded-md shadow-sm text-xl font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-500">
                            {isLoading ? 'Procesando...' : 'Confirmar Ingreso'}
                        </button>
                    )}

                    {!scannerActive && (
                        <button onClick={resetState} className="w-full mt-4 py-4 px-4 border border-gray-600 rounded-md shadow-sm text-xl font-medium text-gray-300 bg-gray-700 hover:bg-gray-600">
                            Escanear/Buscar Otra Caja
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
