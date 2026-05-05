import { NextRequest, NextResponse } from 'next/server';
import { getWorkCards, addWorkCard } from '@/lib/data';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? undefined;
  const cards = await getWorkCards(date);
  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await addWorkCard(body);
  return NextResponse.json(result);
}
