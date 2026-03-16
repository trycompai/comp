import type { VercelRequest, VercelResponse } from '@vercel/node';

let handler:
  | ((req: VercelRequest, res: VercelResponse) => Promise<void>)
  | null = null;

export default async function (
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!handler) {
    handler = await import('../dist/main.js');
  }
  return handler(req, res);
}
