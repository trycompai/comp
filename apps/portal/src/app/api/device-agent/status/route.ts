import type { NextRequest } from 'next/server';
import { proxyToApi } from '../proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('deviceId');
  const organizationId = req.nextUrl.searchParams.get('organizationId');

  const params = new URLSearchParams();
  if (deviceId) params.set('deviceId', deviceId);
  if (organizationId) params.set('organizationId', organizationId);

  const query = params.toString();
  const path = `/v1/device-agent/status${query ? `?${query}` : ''}`;

  return proxyToApi(req, path, 'GET');
}
