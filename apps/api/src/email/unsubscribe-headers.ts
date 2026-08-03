import { generateUnsubscribeToken } from '@trycompai/email';

export function buildUnsubscribeHeaders(to: string): Record<string, string> {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'https://api.trycomp.ai';
  const token = generateUnsubscribeToken(to);
  const oneClickUrl = `${apiBaseUrl}/v1/email/unsubscribe?email=${encodeURIComponent(to)}&token=${encodeURIComponent(token)}`;
  return {
    'List-Unsubscribe': `<${oneClickUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
