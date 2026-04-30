import { NextRequest, NextResponse } from 'next/server';
import { setPlanForPosition } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { positionId, qty } = await req.json();
  if (!positionId || typeof qty !== 'number' || qty < 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  await setPlanForPosition(positionId, qty);
  return NextResponse.json({ ok: true });
}
