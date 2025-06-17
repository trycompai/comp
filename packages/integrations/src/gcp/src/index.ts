import jwt from 'jsonwebtoken';
import nodeFetch from 'node-fetch';

const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const filter = encodeURIComponent('state="ACTIVE" OR state="INACTIVE"');

interface GCPCredentials {
  organization_id: string;
  service_account_key: string; // This will be the serialized JSON string
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface GCPFinding {
  title: string;
  description: string;
  remediation: string;
  status: string;
  severity: string;
  resultDetails: any;
}

function parseServiceAccountKey(serviceAccountKey: string): ServiceAccountKey {
  try {
    return JSON.parse(serviceAccountKey);
  } catch (error) {
    throw new Error('Invalid service account key format');
  }
}

function generateJWT(credentials: GCPCredentials): string {
  const serviceAccount = parseServiceAccountKey(credentials.service_account_key);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: TOKEN_URI,
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };
  return jwt.sign(payload, serviceAccount.private_key, {
    algorithm: 'RS256',
  });
}

async function getAccessToken(credentials: GCPCredentials): Promise<string> {
  const jwtToken = generateJWT(credentials);
  const res = await nodeFetch(TOKEN_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken,
    }),
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

/**
 * Fetches security findings from GCP Security Command Center
 * @returns Promise containing an array of findings
 */
async function fetch(credentials: GCPCredentials): Promise<GCPFinding[]> {
  try {
    const serviceAccount = parseServiceAccountKey(credentials.service_account_key);
    const token = await getAccessToken(credentials);
    const BASE_FINDINGS_URL = `https://securitycenter.googleapis.com/v2/organizations/${credentials.organization_id}/sources/-/findings?pageSize=1000&filter=${filter}`;

    let nextPageToken: string | undefined;
    const allFindings: GCPFinding[] = [];

    do {
      const url = nextPageToken
        ? `${BASE_FINDINGS_URL}&pageToken=${nextPageToken}`
        : BASE_FINDINGS_URL;

      const res = await nodeFetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Goog-User-Project': serviceAccount.project_id,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch findings: ${errorText}`);
      }

      const data = await res.json();
      const findings = data.listFindingsResults?.map((r: any) => r.finding) || [];

      for (const finding of findings) {
        const transformedFinding: GCPFinding = {
          title: finding.description || 'Untitled Finding',
          description: finding.sourceProperties?.Explanation || 'No description available',
          remediation:
            (finding.sourceProperties?.Recommendation || '') +
            (finding.sourceProperties?.ExceptionInstructions || ''),
          status: finding.state === 'ACTIVE' ? 'FAILED' : 'PASSED',
          severity: finding.severity || 'INFO',
          resultDetails: finding,
        };
        allFindings.push(transformedFinding);
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return allFindings;
  } catch (error) {
    console.error('Error fetching GCP security findings:', error);
    throw error;
  }
}

export { fetch };
export type { GCPCredentials, GCPFinding };
