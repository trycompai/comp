import type { NextRequest } from 'next/server';
import { proxyToApi } from '../../proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return proxyToApi(req, `/v1/device-agent/updates/${encodeURIComponent(filename)}`, 'GET');
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  return proxyToApi(req, `/v1/device-agent/updates/${encodeURIComponent(filename)}`, 'HEAD');
}
