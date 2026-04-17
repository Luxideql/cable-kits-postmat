import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

function client() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

type Row = string[];

// Read a single range → rows (including header at [0])
export async function sheetGet(range: string): Promise<Row[]> {
  const res = await client().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  return (res.data.values ?? []) as Row[];
}

// Read multiple ranges in one HTTP request
export async function sheetBatchGet(ranges: string[]): Promise<Row[][]> {
  const res = await client().spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    ranges,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  return (res.data.valueRanges ?? []).map(r => (r.values ?? []) as Row[]);
}

// Create a sheet with headers if it doesn't already exist
export async function sheetEnsure(sheetName: string, headers: string[]): Promise<void> {
  const sheets = client();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: 'sheets.properties.title' });
  const exists = (meta.data.sheets ?? []).some(s => s.properties?.title === sheetName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

// Append a single row
export async function sheetAppend(range: string, row: Row): Promise<void> {
  await client().spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

// Update specific cells
export async function sheetUpdate(range: string, rows: Row[]): Promise<void> {
  await client().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}

// Convert raw rows (with header at [0]) to objects
export function rowsToObjects(rows: Row[]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1)
    .filter(row => row.some(c => c !== '' && c != null))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = String(row[i] ?? ''); });
      return obj;
    });
}

// Upsert: update matching row or append new one. keyColIndex is 0-based.
export async function sheetUpsert(
  sheetName: string,
  cols: string,       // e.g. 'A:D'
  keyColIndex: number,
  keyVal: string,
  row: Row,
): Promise<void> {
  const data = await sheetGet(`${sheetName}!${cols}`);
  const rowIndex = data.findIndex((r, i) => i > 0 && r[keyColIndex] === keyVal);
  if (rowIndex > 0) {
    const col = cols.split(':')[0]; // e.g. 'A'
    await sheetUpdate(`${sheetName}!${col}${rowIndex + 1}`, [row]);
  } else {
    await sheetAppend(`${sheetName}!${cols}`, row);
  }
}
