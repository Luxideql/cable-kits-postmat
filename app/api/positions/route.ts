import { NextResponse } from 'next/server';
import { getPositions, getDailyReports, getProductionPlan } from '@/lib/data';
import { calcPositionStats } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [positions, reports, plan] = await Promise.all([
      getPositions(),
      getDailyReports(),
      getProductionPlan(),
    ]);
    const stats = positions.map(p => calcPositionStats(p, reports, plan));
    return NextResponse.json({ success: true, positions: stats });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
