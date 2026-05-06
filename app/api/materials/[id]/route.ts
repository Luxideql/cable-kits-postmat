import { NextRequest, NextResponse } from 'next/server';
import { updateMaterial, deleteMaterial } from '@/lib/data';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await updateMaterial(params.id, await req.json());
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteMaterial(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
