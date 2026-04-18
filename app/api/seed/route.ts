import { NextResponse } from 'next/server';
import { gasPost } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await gasPost<{ message?: string }>('seed', {});
    return NextResponse.json({ success: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
