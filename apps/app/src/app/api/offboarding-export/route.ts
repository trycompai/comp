import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('memberId');
  if (!memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 });
  }

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    'http://localhost:3333';

  const cookieHeader = request.headers.get('cookie') ?? '';

  const response = await fetch(
    `${apiUrl}/v1/offboarding-checklist/member/${encodeURIComponent(memberId)}/export`,
    { headers: { cookie: cookieHeader } },
  );

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
