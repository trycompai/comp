import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|monitoring|ingest).*)'],
};
