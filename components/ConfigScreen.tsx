
import React, { useState } from 'react';
import type { AirtableCredentials } from '../types';
import { validateCredentials } from '../services/airtableService';

interface ConfigScreenProps {
  onSave: (credentials: AirtableCredentials) => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ onSave }) => {
  const [pat, setPat] = useState('');
  const [baseId, setBaseId] = useState('');
  const [tableId, setTableId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear previous errors on a new submission attempt
    setError(null);

    if (!pat || !baseId || !tableId) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    
    setIsVerifying(true);
    try {
      const credentials = { pat, baseId, tableId };
      await validateCredentials(credentials);
      onSave(credentials);
    } catch (err: any) {
      setError(`Verificación fallida: ${err.message}. Revisa tus credenciales.`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-white mb-6">Configuración de Airtable</h1>
        <p className="text-center text-gray-400 mb-8">
          Ingresa tus credenciales para conectar con tu base de datos.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={isVerifying}>
            <div>
              <label htmlFor="pat" className="block text-sm font-medium text-gray-300">
                Personal Access Token
              </label>
              <input
                type="password"
                id="pat"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="patexample..."
              />
            </div>
            <div>
              <label htmlFor="baseId" className="block text-sm font-medium text-gray-300">
                Base ID
              </label>
              <input
                type="text"
                id="baseId"
                value={baseId}
                onChange={(e) => setBaseId(e.target.value)}
                className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="appXXXXXXXXXXXXXX"
              />
            </div>
            <div>
              <label htmlFor="tableId" className="block text-sm font-medium text-gray-300">
                Table ID
              </label>
              <input
                type="text"
                id="tableId"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="tblXXXXXXXXXXXXXX"
              />
            </div>
          </fieldset>
          
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-md text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-4 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Verificando...' : 'Guardar Configuración'}
          </button>
        </form>
      </div>
    </div>
  );
};
