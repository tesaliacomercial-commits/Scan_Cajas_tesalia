
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
  await handleResponse(response);
  return true;
};

export const findRecordByBoxId = async (
  { pat, baseId, tableId }: AirtableCredentials,
  boxId: string
): Promise<AirtableRecord | null> => {
  const sanitizedBoxId = boxId.replace(/'/g, "\\'");
  // Use a more robust check for non-arrived status
  const filterFormula = encodeURIComponent(`AND({ID_Caja} = '${sanitizedBoxId}')`);
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
  let formula: string;
  const trimmedPrefix = prefix.trim();

  // Robust check: Status_arribo != 1 covers both false and blank/null values in Airtable
  if (trimmedPrefix === '') {
    formula = '{Status_arribo} != 1';
  } else {
    const sanitizedPrefix = trimmedPrefix.replace(/["'\\]/g, '\\$&');
    // Case-insensitive search by forcing lowercase on both ends
    formula = `AND(SEARCH(LOWER("${sanitizedPrefix}"), LOWER({ID_Caja} & "")), {Status_arribo} != 1)`;
  }
  
  const filterFormula = encodeURIComponent(formula);
  // Sort by ID_Caja to make the list readable
  const url = `${API_URL}/${baseId}/${tableId}?filterByFormula=${filterFormula}&maxRecords=100&fields%5B%5D=ID_Caja&sort%5B0%5D%5Bfield%5D=ID_Caja&sort%5B0%5D%5Bdirection%5D=asc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
    },
  });

  const data = await handleResponse<AirtableFindResponse>(response);
  const records = (data && Array.isArray(data.records)) ? data.records : [];
  
  // Filter out any records that might have a null ID_Caja and ensure we return a string
  return records.filter(record => record && record.fields && record.fields.ID_Caja !== undefined && record.fields.ID_Caja !== null);
};
