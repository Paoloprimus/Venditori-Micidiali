import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Se il dominio è reping.it (marketing site)
  if (hostname === 'reping.it' || hostname === 'www.reping.it') {
    // Non rewritare risorse statiche, API, _next
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname.startsWith('/icons') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // Rewrite alla landing page /site
    const url = request.nextUrl.clone();
    
    if (pathname === '/') {
      url.pathname = '/site';
    } else {
      url.pathname = `/site${pathname}`;
    }
    
    return NextResponse.rewrite(url);
  }

  // Per tutti gli altri domini (reping.app), comportamento normale
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
