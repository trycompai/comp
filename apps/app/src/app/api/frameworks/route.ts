import { serverApi } from '@/lib/api-server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await serverApi.get<{ data: { id: string; name: string; description: string; version: string; visible: boolean }[] }>(
      '/v1/frameworks/available',
    );

    const frameworks = Array.isArray(res.data?.data) ? res.data.data : [];
    return NextResponse.json({ frameworks });
  } catch (error) {
    console.error('Error fetching frameworks:', error);
    return NextResponse.json({ error: 'Failed to fetch frameworks' }, { status: 500 });
  }
}
