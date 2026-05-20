import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('memberId');
  const exportAll = request.nextUrl.searchParams.get('all') === 'true';

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    'http://localhost:3333';

  const cookieHeader = request.headers.get('cookie') ?? '';

  const endpoint = exportAll
    ? `${apiUrl}/v1/offboarding-checklist/export-all`
    : memberId
      ? `${apiUrl}/v1/offboarding-checklist/member/${encodeURIComponent(memberId)}/export`
      : null;

  if (!endpoint) {
    return NextResponse.json({ error: 'memberId or all=true required' }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: { cookie: cookieHeader },
    });
  } catch {
    return NextResponse.json({ error: 'Export service unavailable' }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Export failed' },
      { status: response.status },
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set(
    'Content-Disposition',
    response.headers.get('Content-Disposition') ??
      'attachment; filename="offboarding-export.zip"',
  );

  return new NextResponse(response.body, { headers });
}
