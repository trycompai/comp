import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const BLOCKED_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];

/**
 * Check if an IPv4 address falls within private/reserved ranges.
 */
function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts.every((p) => p === 0)) return true;
  return false;
}

/**
 * Check if a hostname is an IPv4-mapped IPv6 address pointing to a private IP.
 * Handles formats like ::ffff:10.0.0.1 and the hex form ::ffff:a0a:1.
 */
function isPrivateIpv6(hostname: string): boolean {
  // URL.hostname keeps brackets for IPv6: [::ffff:a9fe:a9fe]
  const stripped = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  // IPv4-mapped IPv6 with dotted notation: ::ffff:169.254.169.254
  const v4MappedMatch = stripped.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4MappedMatch) {
    return isPrivateIpv4(v4MappedMatch[1]);
  }

  // IPv4-mapped IPv6 in hex form: ::ffff:a9fe:a9fe (169.254.169.254)
  const hexMappedMatch = stripped.match(
    /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/,
  );
  if (hexMappedMatch) {
    const hi = parseInt(hexMappedMatch[1], 16);
    const lo = parseInt(hexMappedMatch[2], 16);
    const ip = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateIpv4(ip);
  }

  // Loopback [::1] is already in BLOCKED_HOSTNAMES
  // Block all-zeros (::)
  if (stripped === '::' || stripped === '0:0:0:0:0:0:0:0') return true;

  return false;
}

export function isSafeUrl(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) return false;
  if (isPrivateIpv4(hostname)) return false;
  if (isPrivateIpv6(hostname)) return false;

  return true;
}

@ValidatorConstraint({ name: 'isSafeUrl', async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isSafeUrl(value);
  }

  defaultMessage(): string {
    return 'The provided URL is not allowed.';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}
