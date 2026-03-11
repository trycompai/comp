import { proxyToApi } from '../proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return proxyToApi(req, '/v1/device-agent/my-organizations', 'GET');
}
