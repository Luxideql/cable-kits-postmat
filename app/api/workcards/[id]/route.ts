import { NextRequest, NextResponse } from 'next/server';
import { updateShiftCard, deleteShiftCard } from '@/lib/data';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const updates = await req.json();
  await updateShiftCard(params.id, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteShiftCard(params.id);
  return NextResponse.json({ ok: true });
}
