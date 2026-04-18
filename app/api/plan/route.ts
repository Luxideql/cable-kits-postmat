import { NextResponse } from 'next/server';
import { getProductionPlan, setPlanForPosition } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plan = await getProductionPlan();
    return NextResponse.json({ success: true, plan });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.positionId) return NextResponse.json({ success: false, error: 'Не вказано позицію' }, { status: 400 });
    await setPlanForPosition(body.positionId, Number(body.qty), body.deadline);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
