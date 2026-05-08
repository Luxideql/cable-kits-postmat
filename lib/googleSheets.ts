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

// Create a sheet with headers if it doesn't already exist.
// Also fixes headers if they are wrong (e.g. data ended up in row 1 instead of headers).
export async function sheetEnsure(sheetName: string, headers: string[]): Promise<void> {
  const sheets = client();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, fields: 'sheets.properties.title,sheets.properties.sheetId' });
  const sheet = (meta.data.sheets ?? []).find(s => s.properties?.title === sheetName);

  if (!sheet) {
    // Create sheet + write headers
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
    return;
  }

  // Sheet exists — check if row 1 is correct headers
  const firstRow = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:1`,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const row1 = ((firstRow.data.values ?? [[]])[0] ?? []) as string[];

  if (row1[0] === 'id') {
    // Headers present — append any missing columns
    const missing = headers.filter(h => !row1.includes(h));
    if (missing.length > 0) {
      const nextCol = String.fromCharCode(65 + row1.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!${nextCol}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [missing] },
      });
    }
    return;
  }

  // Row 1 is not 'id' — insert a new row 1 with correct headers
  const sheetId = sheet.properties?.sheetId ?? 0;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        insertDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
          inheritFromBefore: false,
        },
      }],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  });
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

// Update specific cells (raw values)
export async function sheetUpdate(range: string, rows: Row[]): Promise<void> {
  await client().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}

// Update cells with formula support (USER_ENTERED parses formulas)
export async function sheetUpdateFormula(range: string, rows: Row[]): Promise<void> {
  await client().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
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
