
export interface AirtableCredentials {
  pat: string;
  baseId: string;
  tableId: string;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: {
    ID_Caja: string;
    Status_arribo?: boolean;
    [key: string]: any;
  };
}

export interface AirtableFindResponse {
  records: AirtableRecord[];
}
