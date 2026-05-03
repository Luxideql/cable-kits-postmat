import { NextResponse } from 'next/server';
import { sheetGet, sheetUpdateFormula } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const rows = await sheetGet('Позиції!A:I');
    if (rows.length < 2) return NextResponse.json({ success: true, updated: 0 });

    // Header
    const updates: string[][] = [['фактичний_залишок']];

    // Formula for each data row:
    // = залишок(G) + вироблено(SUMIF) - відправлено(SUM)*кільк_на_компл(E)
    for (let i = 2; i <= rows.length; i++) {
      updates.push([
        `=G${i}+SUMIF(Щоденні_звіти!D:D,A${i},Щоденні_звіти!E:E)-IFERROR(SUM(Відвантаження!C:C),0)*E${i}`,
      ]);
    }

    await sheetUpdateFormula(`Позиції!J1:J${rows.length}`, updates);

    return NextResponse.json({ success: true, updated: rows.length - 1 });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
