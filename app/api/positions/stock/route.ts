import { NextResponse } from 'next/server';
import { updatePositionStock } from '@/lib/data';

export async function PATCH(req: Request) {
  try {
    const { id, stock } = await req.json();
    if (!id || stock === undefined) {
      return NextResponse.json({ success: false, error: 'Missing id or stock' }, { status: 400 });
    }
    await updatePositionStock(String(id), Number(stock));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
