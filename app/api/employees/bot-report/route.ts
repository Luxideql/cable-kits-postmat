import { NextRequest, NextResponse } from 'next/server';
import { setEmployeeBotReport } from '@/lib/data';

export async function POST(req: NextRequest) {
  const { id, botReport } = await req.json();
  if (!id || typeof botReport !== 'boolean') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  await setEmployeeBotReport(id, botReport);
  return NextResponse.json({ ok: true });
}
