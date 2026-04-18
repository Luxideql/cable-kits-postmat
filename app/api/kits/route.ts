import { NextResponse } from 'next/server';
import { getKitStats } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getKitStats();
    return NextResponse.json({ success: true, ...stats });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
