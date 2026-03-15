import { NextRequest } from 'next/server';
import { GET } from './route';

function createRequest(params: Record<string, string>, cookies?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/cli/callback');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const req = new NextRequest(url);

  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value);
    }
  }

  return req;
}

describe('CLI callback route', () => {
  it('should redirect to localhost with session token', async () => {
    const req = createRequest(
      { port: '8417' },
      { 'better-auth.session_token': 'my-session-token-123' },
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('http://localhost:8417/callback');
    expect(location).toContain('token=my-session-token-123');
  });

  it('should return 400 when port is missing', async () => {
    const req = createRequest(
      {},
      { 'better-auth.session_token': 'token' },
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('port');
  });

  it('should return 400 when port is not a number', async () => {
    const req = createRequest(
      { port: 'abc' },
      { 'better-auth.session_token': 'token' },
    );

    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('should return 400 when port is below 1024', async () => {
    const req = createRequest(
      { port: '80' },
      { 'better-auth.session_token': 'token' },
    );

    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('should return 400 when port is above 65535', async () => {
    const req = createRequest(
      { port: '70000' },
      { 'better-auth.session_token': 'token' },
    );

    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it('should prefer __Secure- prefixed cookie for HTTPS environments', async () => {
    const req = createRequest(
      { port: '8417' },
      { '__Secure-better-auth.session_token': 'secure-token-456' },
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('token=secure-token-456');
  });

  it('should fall back to unprefixed cookie when __Secure- is absent', async () => {
    const req = createRequest(
      { port: '8417' },
      { 'better-auth.session_token': 'plain-token-789' },
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('token=plain-token-789');
  });

  it('should return 401 when session cookie is missing', async () => {
    const req = createRequest({ port: '8417' });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toContain('No session');
  });

  it('should URL-encode the token in the redirect', async () => {
    const weirdToken = 'token+with/special=chars&more';
    const req = createRequest(
      { port: '9999' },
      { 'better-auth.session_token': weirdToken },
    );

    const res = await GET(req);
    const location = res.headers.get('location') ?? '';
    const url = new URL(location);

    expect(url.searchParams.get('token')).toBe(weirdToken);
  });

  it('should only redirect to localhost', async () => {
    const req = createRequest(
      { port: '8417' },
      { 'better-auth.session_token': 'token' },
    );

    const res = await GET(req);
    const location = res.headers.get('location') ?? '';

    expect(location).toMatch(/^http:\/\/localhost:/);
  });
});
