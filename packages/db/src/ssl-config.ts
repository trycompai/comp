import { type PeerCertificate, rootCertificates } from 'node:tls';
import { RDS_CA_BUNDLE } from './rds-ca-bundle';

export type SslConfig =
  | undefined
  | {
      ca: string | string[];
      checkServerIdentity: (host: string, cert: PeerCertificate) => Error | undefined;
    }
  | { rejectUnauthorized: false };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalhostUrl(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    const stripped = hostname.replace(/^\[/, '').replace(/\]$/, '');
    return LOCAL_HOSTNAMES.has(stripped);
  } catch {
    // Malformed URL — be conservative and treat as remote so we don't
    // accidentally disable TLS verification.
    return false;
  }
}

// `ssl.ca` *replaces* Node's trust store rather than augmenting it. Our
// `rds-global-bundle.pem` only contains the 108 RDS-specific regional CAs;
// AWS RDS Proxy chains terminate at Amazon Root CA 1, which lives in Node's
// default Mozilla bundle. Combine so both direct-instance and Proxy paths
// validate.
const COMBINED_CA = [RDS_CA_BUNDLE, ...rootCertificates];

const isRdsHostname = (n: string): boolean =>
  n.endsWith('.rds.amazonaws.com') || n.endsWith('.rds.amazonaws.com.cn');

// We connect via an AWS NLB (TCP passthrough) → RDS Proxy. The cert presented
// is the Proxy's, whose SAN list contains the proxy hostname (e.g.
// `*.proxy-XXX.us-east-1.rds.amazonaws.com`) but NOT the NLB hostname
// (`*.elb.amazonaws.com`) we dialed. Default hostname check fails. Instead of
// disabling identity verification entirely (which would let an attacker
// substitute a chain-valid cert for any host), assert the cert is for an AWS
// RDS endpoint. Combined with the pinned trust store + chain validation, an
// attacker would need a forged or wrong-CA cert for an RDS hostname, both of
// which still fail.
export function rdsServerIdentity(_host: string, cert: PeerCertificate): Error | undefined {
  const sans = (cert.subjectaltname ?? '')
    .split(',')
    .map((s) => s.trim().replace(/^DNS:/, ''));
  const cn = (cert.subject as { CN?: string } | undefined)?.CN ?? '';
  if (isRdsHostname(cn) || sans.some(isRdsHostname)) return undefined;
  return new Error(
    `TLS hostname check: cert is not for an AWS RDS endpoint (CN=${cn}, SANs=${sans.join(',')})`,
  );
}

export function resolveSslConfig(
  databaseUrl: string,
  env: Partial<NodeJS.ProcessEnv> = process.env,
): SslConfig {
  if (isLocalhostUrl(databaseUrl)) return undefined;
  if (env.PRISMA_ALLOW_INSECURE_TLS === '1') return { rejectUnauthorized: false };
  return { ca: COMBINED_CA, checkServerIdentity: rdsServerIdentity };
}
