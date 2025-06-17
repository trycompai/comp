import jwt from 'jsonwebtoken';
import fetch from 'node-fetch'; // Use node-fetch if you're on Node <18
import { readFileSync } from 'node:fs';
import path from 'node:path';

const keyPath = path.resolve(__dirname, 'xxx');
const keyData = JSON.parse(readFileSync(keyPath, 'utf-8'));

const ORG_ID = 'xxx';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const filter = encodeURIComponent('state="ACTIVE" OR state="INACTIVE"');
const BASE_FINDINGS_URL = `https://securitycenter.googleapis.com/v2/organizations/${ORG_ID}/sources/-/findings?pageSize=1000&filter=${filter}`;

function generateJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: keyData.client_email,
    sub: keyData.client_email,
    aud: TOKEN_URI,
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };
  return jwt.sign(payload, keyData.private_key, { algorithm: 'RS256' });
}

async function getAccessToken(): Promise<string> {
  const jwtToken = generateJWT();
  const res = await fetch(TOKEN_URI, {
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

async function dumpOrgFindings(token: string) {
  let nextPageToken: string | undefined;
  let total = 0;
  let page = 1;

  console.log(`🔍 Fetching findings for org: ${ORG_ID}`);

  do {
    const url = nextPageToken
      ? `${BASE_FINDINGS_URL}&pageToken=${nextPageToken}`
      : BASE_FINDINGS_URL;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Goog-User-Project': keyData.project_id, // REQUIRED for org-level access
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch findings: ${errorText}`);
    }

    const data = await res.json();
    const findings = data.listFindingsResults?.map((r: any) => r.finding) || [];

    if (findings.length > 0) {
      console.log(`\n📄 Page ${page} - ${findings.length} findings:\n`);
      for (const finding of findings) {
        console.log(finding);
        /* let controlDetails: any[] = {
          Id: finding.name,
          name: finding.category,
          standard: finding.sourceProperties?.Recommendation || finding.sourceProperties?.Explanation || '—',
          Title: finding.sourceProperties?.Recommendation || finding.sourceProperties?.Explanation || '—',
          description: finding.description || '',
          state: finding.state,
          Compliance: {
            Status: finding.state === "ACTIVE" ? "FAILED" : "PASSED",
          },
          Severity: {
            Label: "INFO",
          },
          Description: controlDetail.properties.description,
          Remediation: {
            Recommendation: {
              Text: controlDetail.properties.description,
              Url: "",
            },
          },
        }; */
      }
      total += findings.length;
    }

    nextPageToken = data.nextPageToken;
    page++;
  } while (nextPageToken);

  console.log(`\n✅ Total findings retrieved: ${total}`);
}

async function run() {
  const token = await getAccessToken();
  console.log(`🔐 Authenticated as ${keyData.client_email}`);
  await dumpOrgFindings(token);
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
});
