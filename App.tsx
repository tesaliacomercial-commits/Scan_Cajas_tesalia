
import React, { useState, useEffect, useCallback } from 'react';
import { ConfigScreen } from './components/ConfigScreen';
import { MainScreen } from './components/MainScreen';
import type { AirtableCredentials } from './types';

const App: React.FC = () => {
  const [credentials, setCredentials] = useState<AirtableCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const pat = localStorage.getItem('airtable_pat');
      const baseId = localStorage.getItem('airtable_base_id');
      const tableId = localStorage.getItem('airtable_table_id');

      if (pat && baseId && tableId) {
        setCredentials({ pat, baseId, tableId });
      }
    } catch (error) {
      console.error("Failed to read credentials from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSaveConfig = useCallback((creds: AirtableCredentials) => {
    try {
      localStorage.setItem('airtable_pat', creds.pat);
      localStorage.setItem('airtable_base_id', creds.baseId);
      localStorage.setItem('airtable_table_id', creds.tableId);
      setCredentials(creds);
    } catch (error) {
      console.error("Failed to save credentials to localStorage", error);
      alert("Error al guardar la configuración. Revisa los permisos del navegador.");
    }
  }, []);

  const handleClearConfig = useCallback(() => {
    try {
      localStorage.removeItem('airtable_pat');
      localStorage.removeItem('airtable_base_id');
      localStorage.removeItem('airtable_table_id');
      setCredentials(null);
    } catch (error) {
      console.error("Failed to clear credentials from localStorage", error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-xl text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {credentials ? (
        <MainScreen credentials={credentials} onClearConfig={handleClearConfig} />
      ) : (
        <ConfigScreen onSave={handleSaveConfig} />
      )}
    </div>
  );
};

export default App;
