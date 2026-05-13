import { getBillingSkuProductKey } from '@trycompai/billing';
import type { AttachFormValues } from './BackgroundCheckAttachForm';
import type { BackgroundCheckBillingStatus } from './backgroundCheckTypes';

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function computeCredits(billing: BackgroundCheckBillingStatus | undefined): {
  creditsUsed: number;
  creditsIncluded: number;
} {
  if (!billing) return { creditsUsed: 0, creditsIncluded: 0 };
  const activeSub = (billing.subscriptions ?? []).find(
    (s) =>
      getBillingSkuProductKey(s.skuKey) === 'background_check' &&
      (s.status === 'active' || s.status === 'trialing'),
  );
  const wallet =
    (billing.creditBalances ?? []).find((b) => b.productKey === 'background_check')?.balance ?? 0;
  const subIncluded = activeSub?.includedQuantity ?? 0;
  const subUsed = activeSub?.usedQuantity ?? 0;
  return { creditsUsed: subUsed, creditsIncluded: subIncluded + wallet };
}

export function buildAttachNotes(values: AttachFormValues): string | undefined {
  const parts = [
    values.vendor ? `Vendor: ${values.vendor}` : null,
    values.reportDate ? `Report date: ${values.reportDate}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }
      const [, base64Data] = reader.result.split(',');
      if (!base64Data) {
        reject(new Error('Failed to read file'));
        return;
      }
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
