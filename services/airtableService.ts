
import type { AirtableCredentials, AirtableRecord, AirtableFindResponse } from '../types';

const API_URL = 'https://api.airtable.com/v0';

export class AirtableError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AirtableError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Error de API: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error?.message) {
        errorMessage = errorBody.error.message;
      }
    } catch (e) {
      // Ignore if response is not json
    }
    throw new AirtableError(errorMessage, response.status);
  }
  return response.json() as Promise<T>;
}

export const validateCredentials = async ({ pat, baseId, tableId }: AirtableCredentials): Promise<boolean> => {
  const url = `${API_URL}/${baseId}/${tableId}?maxRecords=1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });
  // If handleResponse doesn't throw, the credentials are valid
  await handleResponse(response);
  return true;
};

export const findRecordByBoxId = async (
  { pat, baseId, tableId }: AirtableCredentials,
  boxId: string
): Promise<AirtableRecord | null> => {
  const filterFormula = encodeURIComponent(`{ID_Caja} = '${boxId}'`);
  const url = `${API_URL}/${baseId}/${tableId}?filterByFormula=${filterFormula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });

  const data = await handleResponse<AirtableFindResponse>(response);

  return data.records.length > 0 ? data.records[0] : null;
};

export const updateRecordStatus = async (
  { pat, baseId, tableId }: AirtableCredentials,
  recordId: string
): Promise<AirtableRecord> => {
    const url = `${API_URL}/${baseId}/${tableId}/${recordId}`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${pat}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fields: {
                Status_arribo: true,
            },
        }),
    });

    return handleResponse<AirtableRecord>(response);
};

export const searchRecordsByBoxIdPrefix = async (
  { pat, baseId, tableId }: AirtableCredentials,
  prefix: string
): Promise<AirtableRecord[]> => {
  // Use SEARCH for case-insensitive partial matching.
  const filterFormula = encodeURIComponent(`SEARCH("${prefix}", {ID_Caja})`);
  const url = `${API_URL}/${baseId}/${tableId}?filterByFormula=${filterFormula}&maxRecords=5&fields%5B%5D=ID_Caja&fields%5B%5D=Status_arribo`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });

  const data = await handleResponse<AirtableFindResponse>(response);
  return data.records;
};
