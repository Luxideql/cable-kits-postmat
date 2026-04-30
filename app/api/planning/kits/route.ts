import { NextRequest, NextResponse } from 'next/server';
import { getPositions, setPlanForPosition } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { qty } = await req.json();
  if (typeof qty !== 'number' || qty < 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const positions = await getPositions();
  await Promise.all(positions.map(p => setPlanForPosition(p.id, qty)));
  return NextResponse.json({ ok: true });
}
