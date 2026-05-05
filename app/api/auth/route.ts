import { NextResponse } from 'next/server';

const CODE   = '6323';
const COOKIE = 'app_auth';

export async function POST(req: Request) {
  const { code } = await req.json();
  if (code !== CODE) {
    return NextResponse.json({ error: 'Невірний пароль' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, CODE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
