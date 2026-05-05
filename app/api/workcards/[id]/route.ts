import { NextRequest, NextResponse } from 'next/server';
import { updateWorkCard } from '@/lib/data';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const updates = await req.json();
  await updateWorkCard(params.id, updates);
  return NextResponse.json({ ok: true });
}
