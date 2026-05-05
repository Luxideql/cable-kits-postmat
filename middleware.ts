import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PASSWORD = '6323';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip: Telegram webhook and Next.js internals
  if (
    pathname.startsWith('/api/telegram') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const auth = req.headers.get('authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded  = atob(auth.slice(6));
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (password === PASSWORD) return NextResponse.next();
    } catch { /* invalid base64 */ }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Вхід", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
