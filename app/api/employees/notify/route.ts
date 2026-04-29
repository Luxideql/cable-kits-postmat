import { NextRequest, NextResponse } from 'next/server';
import { setEmployeeNotify } from '@/lib/data';

export async function POST(req: NextRequest) {
  const { id, notify } = await req.json();
  if (!id || typeof notify !== 'boolean') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  await setEmployeeNotify(id, notify);
  return NextResponse.json({ ok: true });
}
