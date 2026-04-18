import { NextResponse } from 'next/server';
import { setWebhook, deleteWebhook } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.delete) {
      const r = await deleteWebhook();
      return NextResponse.json({ success: true, result: r });
    }
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
    if (!appUrl) return NextResponse.json({ success: false, error: 'NEXT_PUBLIC_APP_URL не задано' }, { status: 400 });
    const webhookUrl = `${appUrl}/api/telegram`;
    const result = await setWebhook(webhookUrl);
    return NextResponse.json({ success: true, webhookUrl, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
