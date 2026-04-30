import { NextRequest, NextResponse } from 'next/server';
import { getDailyPlanQty, setDailyPlanQty } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const qty = await getDailyPlanQty();
  return NextResponse.json({ qty });
}

export async function POST(req: NextRequest) {
  const { qty } = await req.json();
  if (typeof qty !== 'number' || qty < 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  await setDailyPlanQty(qty);
  return NextResponse.json({ ok: true });
}
