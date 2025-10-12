import { NextResponse, type NextRequest } from 'next/server';
import { Novu } from '@novu/api';

export async function POST(request: NextRequest) {
  let events;
  try {
    events = await request.json();
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // You may want to validate required fields in the body here
  // For now, we just pass the whole body to Novu

  const novuApiKey = process.env.NOVU_API_KEY;
  if (!novuApiKey) {
    return NextResponse.json(
      { success: false, error: 'Novu API key not configured' },
      { status: 500 }
    );
  }

  const novu = new Novu({ secretKey: novuApiKey });

  try {
    // Throttle calls: process in batches of 2 events per second to avoid rate limit
    const batchSize = 2;
    const results: unknown[] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((event: any) =>
          novu.trigger({
            workflowId: "new-policy-email",
            to: {
              subscriberId: event.subscriberId,
              email: event.email,
            },
            payload: event,
          })
        )
      );
      results.push(...batchResults);
      // If there are more batches to process, wait 1 second
      if (i + batchSize < events.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    const result = { triggered: results.length, details: results };

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger notification',
      },
      { status: 500 }
    );
  }
}
