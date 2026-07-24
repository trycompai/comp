import { type NextRequest, NextResponse } from 'next/server';

// Only ever a bare hostname — keeps this a favicon proxy, never an open fetch.
const HOSTNAME = /^[a-z0-9.-]+$/i;

/**
 * Server-side vendor-logo proxy. The client requests /api/vendor-logo?host=… and
 * we fetch the favicon here, so the browser never calls a third-party icon CDN
 * directly — that would leak which vendors an org uses and trip the app CSP.
 * Cached hard (logos rarely change); the caller falls back to a monogram on 404.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const host = req.nextUrl.searchParams.get('host')?.toLowerCase().trim() ?? '';
  if (!host || host.length > 253 || !HOSTNAME.test(host)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
      { cache: 'no-store', signal: AbortSignal.timeout(5000) },
    );
    if (!upstream.ok) return new NextResponse(null, { status: 404 });

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/x-icon',
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
