import { NextRequest, NextResponse } from 'next/server';
import { getShiftCards, addShiftCard } from '@/lib/data';

export async function GET() {
  const cards = await getShiftCards();
  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await addShiftCard(body);
  return NextResponse.json(result);
}
