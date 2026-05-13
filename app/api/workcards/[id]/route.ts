import { NextRequest, NextResponse } from 'next/server';
import { updateShiftCard } from '@/lib/data';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const updates = await req.json();
  await updateShiftCard(params.id, updates);
  return NextResponse.json({ ok: true });
}
