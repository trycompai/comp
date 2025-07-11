import { env } from '@/env.mjs';

const HUBSPOT_API_URL = 'https://api.hubapi.com/crm/v3/objects';

/**
 * Custom error class for HubSpot API errors
 * @extends Error
 */
export class HubSpotAPIError extends Error {
  /**
   * Creates a new HubSpotAPIError
   * @param message - Error message
   * @param statusCode - HTTP status code from the API response
   * @param responseData - Raw response data from the API
   */
  constructor(
    message: string,
    public statusCode?: number,
    public responseData?: unknown,
  ) {
    super(message);
    this.name = 'HubSpotAPIError';
  }
}

/**
 * Makes authenticated requests to the HubSpot API
 * @param endpoint - API endpoint (can be relative or absolute URL)
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise resolving to the Response object
 * @throws {HubSpotAPIError} When HubSpot API key is not configured
 *
 * @example
 * ```typescript
 * const response = await makeHubSpotRequest("/contacts", {
 *   method: "POST",
 *   body: JSON.stringify({ properties: { email: "test@example.com" } })
 * });
 * ```
 */
export async function makeHubSpotRequest(
  endpoint: string,
  options: RequestInit,
): Promise<Response> {
  const HUBSPOT_ACCESS_TOKEN = env.HUBSPOT_ACCESS_TOKEN;

  if (!HUBSPOT_ACCESS_TOKEN) {
    throw new HubSpotAPIError('HubSpot API key not configured');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${HUBSPOT_API_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Checks if HubSpot API is properly configured
 * @returns true if the API key is set, false otherwise
 *
 * @example
 * ```typescript
 * if (!isHubSpotConfigured()) {
 *   console.error("HubSpot is not configured");
 *   return;
 * }
 * ```
 */
export function isHubSpotConfigured(): boolean {
  return !!env.HUBSPOT_ACCESS_TOKEN;
}
