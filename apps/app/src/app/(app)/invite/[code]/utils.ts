export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal =
    local.length <= 2 ? `${local[0] ?? ''}***` : `${local[0]}***${local.slice(-1)}`;

  const domainParts = domain.split('.');
  if (domainParts.length === 0) return `${maskedLocal}@***`;
  const tld = domainParts[domainParts.length - 1];
  const secondLevel = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : '';
  const maskedSecondLevel = secondLevel ? `${secondLevel[0]}***` : '***';

  return `${maskedLocal}@${maskedSecondLevel}.${tld}`;
}
