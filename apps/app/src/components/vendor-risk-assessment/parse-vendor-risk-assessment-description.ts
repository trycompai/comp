import type {
  VendorRiskAssessmentDataV1,
  VendorRiskAssessmentLink,
} from './vendor-risk-assessment-types';

type TipTapNode = {
  type?: string;
  content?: TipTapNode[];
  text?: string;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
};

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getText(node: TipTapNode | undefined): string {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  if (!node.content) return '';
  return node.content.map(getText).join('');
}

function isBoldTextNode(node: TipTapNode | undefined): boolean {
  const marks = node?.marks;
  if (!Array.isArray(marks)) return false;
  return marks.some((m) => m?.type === 'bold');
}

function extractLinksFromBulletList(node: TipTapNode): VendorRiskAssessmentLink[] {
  const list: VendorRiskAssessmentLink[] = [];
  if (!Array.isArray(node.content)) return list;

  for (const li of node.content) {
    const paragraph = li?.content?.find((c) => c?.type === 'paragraph');
    const textNode = paragraph?.content?.find((c) => typeof c?.text === 'string');
    const label = (textNode?.text ?? '').trim();

    const linkMark = textNode?.marks?.find((m) => m?.type === 'link');
    const href =
      (linkMark?.attrs?.href && typeof linkMark.attrs.href === 'string'
        ? linkMark.attrs.href
        : null) ?? null;

    if (label && href) {
      list.push({ label, url: href });
    }
  }

  return list;
}

export function parseVendorRiskAssessmentDescription(
  description: string | null | undefined,
): VendorRiskAssessmentDataV1 | null {
  if (!description) return null;

  const parsed = tryParseJson(description);
  if (!parsed || typeof parsed !== 'object') return null;

  // New structured format
  if ('kind' in parsed && (parsed as { kind?: unknown }).kind === 'vendorRiskAssessmentV1') {
    return parsed as VendorRiskAssessmentDataV1;
  }

  // Legacy TipTap doc JSON: extract company overview, links, and certifications
  if ((parsed as { type?: unknown }).type !== 'doc') return null;

  const content = (parsed as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;

  let companyOverview: string | null = null;
  let links: VendorRiskAssessmentLink[] = [];
  const certifications: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const node = content[i] as TipTapNode;
    if (node?.type !== 'paragraph') continue;

    const firstChild = node.content?.[0];
    const labelText = (firstChild?.text ?? '').trim();
    const isLabel = isBoldTextNode(firstChild);

    if (!isLabel) continue;

    if (labelText === 'Company Overview:') {
      const next = content[i + 1] as TipTapNode | undefined;
      if (next?.type === 'paragraph') {
        companyOverview = getText(next).trim() || null;
      }
    }

    if (labelText === 'Security Certifications:') {
      const next = content[i + 1] as TipTapNode | undefined;
      if (next?.type === 'bulletList' && Array.isArray(next.content)) {
        for (const li of next.content) {
          const text = getText(li).trim();
          if (text) certifications.push(text);
        }
      }
    }

    if (labelText === 'Relevant Links:') {
      const next = content[i + 1] as TipTapNode | undefined;
      if (next?.type === 'bulletList') {
        links = extractLinksFromBulletList(next);
      }
    }
  }

  const legacyLinks = links.length > 0 ? links : null;
  const legacyCerts =
    certifications.length > 0
      ? certifications.map((c) => ({ type: c, status: 'unknown' as const }))
      : null;

  // If we couldn't extract anything meaningful, treat as non-vendor-risk content
  if (!companyOverview && !legacyLinks && !legacyCerts) return null;

  return {
    kind: 'vendorRiskAssessmentV1',
    vendorName: null,
    vendorWebsite: null,
    lastResearchedAt: null,
    riskLevel: null,
    securityAssessment: companyOverview,
    links: legacyLinks,
    certifications: legacyCerts,
    news: null,
  };
}


