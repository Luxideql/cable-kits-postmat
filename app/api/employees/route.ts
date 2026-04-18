import { NextResponse } from 'next/server';
import { getEmployees, getDailyReports, addEmployee } from '@/lib/data';
import type { EmployeeStats } from '@/lib/types';
import { getTodayDate } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [employees, reports] = await Promise.all([getEmployees(), getDailyReports()]);
    const today = getTodayDate();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const stats: EmployeeStats[] = employees.map(emp => {
      const mine = reports.filter(r => r.employeeId === emp.id);
      return {
        ...emp,
        todayQty: mine.filter(r => r.date === today).reduce((s, r) => s + r.qty, 0),
        weekQty: mine.filter(r => r.date >= weekAgo).reduce((s, r) => s + r.qty, 0),
        totalQty: mine.reduce((s, r) => s + r.qty, 0),
      };
    });

    return NextResponse.json({ success: true, employees: stats });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emp = await addEmployee({
      fullName: body.fullName,
      telegramId: body.telegramId ?? '',
      position: body.position ?? '',
      active: true,
    });
    return NextResponse.json({ success: true, employee: emp });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
