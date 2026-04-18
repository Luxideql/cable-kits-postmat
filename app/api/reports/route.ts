import { NextResponse } from 'next/server';
import { getDailyReports, addDailyReport } from '@/lib/data';
import { getTodayDate } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? undefined;
    const empId = searchParams.get('employeeId') ?? undefined;
    let reports = await getDailyReports(date);
    if (empId) reports = reports.filter(r => r.employeeId === empId);
    return NextResponse.json({ success: true, reports });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.employeeId) return NextResponse.json({ success: false, error: 'Не вказано працівника' }, { status: 400 });
    if (!body.positionId) return NextResponse.json({ success: false, error: 'Не вказано позицію' }, { status: 400 });
    const qty = Number(body.qty);
    if (!qty || qty <= 0) return NextResponse.json({ success: false, error: 'Кількість має бути > 0' }, { status: 400 });

    const report = await addDailyReport({
      date: body.date ?? getTodayDate(),
      employeeId: body.employeeId,
      positionId: body.positionId,
      qty,
      hours: Number(body.hours ?? 0),
      comment: body.comment ?? '',
    });
    return NextResponse.json({ success: true, report });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
