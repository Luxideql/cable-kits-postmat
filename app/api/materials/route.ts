import { NextRequest, NextResponse } from 'next/server';
import { getMaterials, addMaterial } from '@/lib/data';

export async function GET() {
  try {
    return NextResponse.json(await getMaterials());
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(await addMaterial(body));
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
