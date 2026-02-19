import * as https from 'node:https';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';

interface TlsCertInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  protocol: string;
}

function inspectTls(
  url: string,
): Promise<{ statusCode: number; cert: TlsCertInfo }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname || '/',
        method: 'GET',
        rejectUnauthorized: true,
        timeout: 15_000,
      },
      (res) => {
        const socket = res.socket as import('tls').TLSSocket;
        const peerCert = socket.getPeerCertificate();
        const cert: TlsCertInfo = {
          subject: peerCert.subject?.CN ?? '',
          issuer: peerCert.issuer?.O ?? peerCert.issuer?.CN ?? '',
          validFrom: peerCert.valid_from ?? '',
          validTo: peerCert.valid_to ?? '',
          protocol: socket.getProtocol() ?? '',
        };
        res.resume();
        resolve({ statusCode: res.statusCode ?? 0, cert });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TLS connection timed out'));
    });
    req.end();
  });
}

export const tlsHttpsCheck: IntegrationCheck = {
  id: 'website_tls_https',
  name: 'TLS / HTTPS Enabled',
  description:
    'Verify that the organization website has a valid TLS certificate and serves over HTTPS.',
  taskMapping: TASK_TEMPLATES.tlsHttps,
  defaultSeverity: 'high',

  run: async (ctx) => {
    const website = ctx.credentials.website as string | undefined;
    if (!website) {
      ctx.fail({
        title: 'No website configured',
        description:
          'Organization has no website URL set. Cannot verify TLS/HTTPS.',
        resourceType: 'website',
        resourceId: 'unknown',
        severity: 'medium',
        remediation:
          'Set your organization website in Settings to enable this check.',
      });
      return;
    }

    let httpsUrl = website;
    if (!/^https?:\/\//i.test(httpsUrl)) {
      httpsUrl = `https://${httpsUrl}`;
    }

    const parsed = new URL(httpsUrl);
    if (parsed.protocol !== 'https:') {
      httpsUrl = `https://${parsed.host}${parsed.pathname}`;
    }

    ctx.log(`Checking TLS for ${httpsUrl}`);

    try {
      const { statusCode, cert } = await inspectTls(httpsUrl);

      const validTo = new Date(cert.validTo);
      const isExpired = validTo < new Date();

      if (isExpired) {
        ctx.fail({
          title: `TLS certificate expired for ${parsed.hostname}`,
          description: `Certificate expired on ${cert.validTo}. Issued by ${cert.issuer}.`,
          resourceType: 'website',
          resourceId: parsed.hostname,
          severity: 'critical',
          remediation:
            'Renew your TLS certificate immediately. If using a provider like Let\'s Encrypt, check that auto-renewal is working.',
          evidence: {
            url: httpsUrl,
            statusCode,
            protocol: cert.protocol,
            issuer: cert.issuer,
            subject: cert.subject,
            validFrom: cert.validFrom,
            validTo: cert.validTo,
            checkedAt: new Date().toISOString(),
          },
        });
        return;
      }

      ctx.pass({
        title: `TLS/HTTPS enabled for ${parsed.hostname}`,
        description: `Valid TLS certificate (${cert.protocol}). Issued by ${cert.issuer}. Expires ${cert.validTo}. HTTP status ${statusCode}.`,
        resourceType: 'website',
        resourceId: parsed.hostname,
        evidence: {
          url: httpsUrl,
          statusCode,
          protocol: cert.protocol,
          issuer: cert.issuer,
          subject: cert.subject,
          validFrom: cert.validFrom,
          validTo: cert.validTo,
          checkedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.fail({
        title: `TLS/HTTPS check failed for ${parsed.hostname}`,
        description: `Could not establish a valid HTTPS connection: ${message}`,
        resourceType: 'website',
        resourceId: parsed.hostname,
        severity: 'high',
        remediation:
          '1. Ensure your website is accessible over HTTPS\n2. Check that your TLS certificate is valid and not expired\n3. Verify your DNS and server configuration',
      });
    }
  },
};
