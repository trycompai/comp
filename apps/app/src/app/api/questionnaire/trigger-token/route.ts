import { NextResponse } from 'next/server';

// Task-scoped browser tokens cannot bind organizationId to the authenticated
// user. Uploading, parsing and answering use the permission-gated API instead.
export async function POST() {
  return NextResponse.json(
    { error: 'Public questionnaire task tokens are retired. Use the questionnaire API.' },
    { status: 410 },
  );
}
