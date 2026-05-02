import { NextResponse } from 'next/server';
import { getPositions, addDailyReport } from '@/lib/data';
import { getTodayDate } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

// Mode "kits": { kits, date, employeeId }
// Mode "individual": { entries: [{positionId, qty}], date, employeeId }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const date = body.date || getTodayDate();
    const employeeId = body.employeeId || '';

    if (body.entries) {
      // Individual mode
      const entries: { positionId: string; qty: number }[] = body.entries;
      const valid = entries.filter(e => e.qty > 0);
      if (valid.length === 0) {
        return NextResponse.json({ success: false, error: 'Введіть кількість хоча б для однієї позиції' }, { status: 400 });
      }
      await Promise.all(
        valid.map(e =>
          addDailyReport({
            date,
            employeeId,
            positionId: e.positionId,
            qty: e.qty,
            hours: 0,
            comment: 'Веб: поштучно',
          })
        )
      );
      const totalUnits = valid.reduce((s, e) => s + e.qty, 0);
      return NextResponse.json({ success: true, count: valid.length, totalUnits });
    }

    // Kits mode
    const kits = Number(body.kits);
    if (!kits || kits <= 0) {
      return NextResponse.json({ success: false, error: 'Кількість комплектів має бути > 0' }, { status: 400 });
    }
    const positions = await getPositions();
    const active = positions.filter(p => p.qtyPerPostomat > 0);
    if (active.length === 0) {
      return NextResponse.json({ success: false, error: 'Немає активних позицій з кількістю на комплект' }, { status: 400 });
    }
    await Promise.all(
      active.map(p =>
        addDailyReport({
          date,
          employeeId,
          positionId: p.id,
          qty: kits * p.qtyPerPostomat,
          hours: 0,
          comment: `Веб: ${kits} компл.`,
        })
      )
    );
    const totalUnits = active.reduce((s, p) => s + kits * p.qtyPerPostomat, 0);
    return NextResponse.json({ success: true, count: active.length, kits, totalUnits });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
