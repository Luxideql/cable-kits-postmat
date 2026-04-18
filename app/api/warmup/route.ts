import { NextResponse } from 'next/server';
import { gasGet } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await gasGet<{ version: string }>('ping');
    return NextResponse.json({ ok: true, gas: r });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
