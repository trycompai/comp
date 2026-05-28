export interface ParsedApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export function getCloudSecurityApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3333';
}

export function makeServiceTokenHeaders(params: {
  organizationId: string;
  userId?: string;
}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-service-token': process.env.SERVICE_TOKEN_TRIGGER ?? '',
    'x-organization-id': params.organizationId,
    ...(params.userId && { 'x-user-id': params.userId }),
  };
}

export async function postCloudSecurityApi<T>(params: {
  path: string;
  body: Record<string, unknown>;
  organizationId: string;
  userId?: string;
}): Promise<{ data?: T; error?: string }> {
  const url = `${getCloudSecurityApiBaseUrl()}${params.path}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: makeServiceTokenHeaders({
        organizationId: params.organizationId,
        userId: params.userId,
      }),
      body: JSON.stringify(params.body),
    });
    const parsed = await parseApiResponse<T>(response, url);
    if (!parsed.ok) {
      return { error: parsed.error ?? `HTTP ${parsed.status}` };
    }
    return { data: parsed.data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function parseApiResponse<T>(
  response: Response,
  url: string,
): Promise<ParsedApiResponse<T>> {
  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const parsed = parseJsonBody(body);

  if (!parsed.ok) {
    const error =
      parsed.reason === 'empty'
        ? `HTTP ${response.status} from ${url} returned an empty response body.`
        : buildNonJsonError({
            status: response.status,
            url,
            contentType,
            body,
          });

    return {
      ok: false,
      status: response.status,
      error,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: getMessage(parsed.value) ?? `HTTP ${response.status}`,
      data: parsed.value as T,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: parsed.value as T,
  };
}

function parseJsonBody(
  body: string,
): { ok: true; value: unknown } | { ok: false; reason: 'empty' | 'invalid' } {
  if (!body.trim()) return { ok: false, reason: 'empty' };

  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

function getMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const message = (value as Record<string, unknown>).message;
  return typeof message === 'string' ? message : undefined;
}

function buildNonJsonError(params: {
  status: number;
  url: string;
  contentType: string;
  body: string;
}): string {
  const contentType = params.contentType || 'unknown content type';
  const snippet = params.body.trim().replace(/\s+/g, ' ').slice(0, 160);
  const suffix = snippet ? ` Body starts with: ${snippet}` : '';
  return `HTTP ${params.status} from ${params.url} returned ${contentType}, not JSON.${suffix}`;
}
