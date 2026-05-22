import { describe, expect, it } from 'vitest';
import { parseApiResponse } from './api-response';

describe('parseApiResponse', () => {
  it('returns parsed JSON for successful responses', async () => {
    const response = new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const parsed = await parseApiResponse<{ status: string }>(
      response,
      'https://api.trycomp.ai/v1/cloud-security/remediation/execute',
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.data).toEqual({ status: 'success' });
  });

  it('uses JSON message fields for failed API responses', async () => {
    const response = new Response(JSON.stringify({ message: 'Bad request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });

    const parsed = await parseApiResponse(response, 'https://api.test/v1/x');

    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe('Bad request');
  });

  it('turns HTML responses into actionable errors instead of JSON parse text', async () => {
    const response = new Response('<html><h1>Not Found</h1></html>', {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

    const parsed = await parseApiResponse(response, 'https://app.test/v1/x');

    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain('HTTP 404 from https://app.test/v1/x');
    expect(parsed.error).toContain('text/html');
    expect(parsed.error).toContain('not JSON');
  });

  it('treats empty response bodies as failed responses', async () => {
    const response = new Response('', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const parsed = await parseApiResponse(response, 'https://api.test/v1/x');

    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe(
      'HTTP 200 from https://api.test/v1/x returned an empty response body.',
    );
  });
});
