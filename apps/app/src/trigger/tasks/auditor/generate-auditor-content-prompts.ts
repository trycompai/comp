// Pure prompt + input-assembly logic for the auditor content generation task
// (see ./generate-auditor-content.ts). Kept dependency-free (no DB / AI /
// Trigger.dev imports) so the prompt contract and prompt assembly can be unit
// tested in isolation. See CS-589.

export const SECTIONS = [
  'company-background',
  'services',
  'mission-vision',
  'system-description',
  'critical-vendors',
  'subservice-organizations',
] as const;

export type Section = (typeof SECTIONS)[number];

// Map from section keys to Context question strings
export const SECTION_QUESTIONS: Record<Section, string> = {
  'company-background': 'Company Background & Overview of Operations',
  services: 'Types of Services Provided',
  'mission-vision': 'Mission & Vision',
  'system-description': 'System Description',
  'critical-vendors': 'Critical Vendors',
  'subservice-organizations': 'Subservice Organizations',
};

// A single vendor as recorded in the org's Vendors tab.
export type VendorTabEntry = {
  name: string;
  description: string | null;
  category: string | null;
  website: string | null;
};

// The narrative (prose) sections — exclusions/word guidance apply to these, but
// NOT to the two list sections (critical-vendors, subservice-organizations).
export const NARRATIVE_SECTIONS: readonly Section[] = [
  'company-background',
  'services',
  'mission-vision',
  'system-description',
];

// Shared tone rules — applied to every section.
export const TONE_RULES = `
TONE:
- Direct, declarative voice. State facts without attribution.
- No hedging ("may", "might", "likely", "appears").
- No meta phrases ("the website says", "according to", "it appears").
- Third person, simple present tense.
- NEVER mention missing information - only write about what IS available.
`;

// Exclusions for the narrative (prose) sections only — NOT the vendor list
// sections, which are intentionally formatted lists. SOC 2 narrative fields are
// lifted verbatim into the customer's report, so headcount and named personnel
// must never appear. See CS-589.
export const NARRATIVE_EXCLUSIONS = `
EXCLUSIONS (strict):
- Do NOT state the number of employees or headcount.
- Do NOT name any individuals or cite their roles/titles (no "led by CEO <name>", no founder or executive names, no personnel or org-chart detail).
- No marketing language, value judgments, tables, bullet lists, citations, or URLs.
`;

export const sectionPrompts: Record<Section, string> = {
  'company-background': `Write ONE paragraph (~80 words) describing the company background and operations.

INCLUDE (where available): company name, what they do, headquarters location, certifications, operational scope, and infrastructure/architecture facts.

EXAMPLE:
"[Company] is a [type of business] headquartered in [location], with operations serving [markets/regions]. It operates [products/services] that [what they do]. It holds [certifications]. Its services run on [infrastructure/architecture]."

RULES:
- Do NOT include the section title.
- ONE paragraph only, ~80 words.
- No bullet points.
${NARRATIVE_EXCLUSIONS}${TONE_RULES}`,

  services: `Write ONE paragraph (~60 words) describing the services/products provided.

INCLUDE (where available): service categories, specific service types, technology approach, target markets, business model aspects.

EXAMPLE:
"The company provides [service categories] including [specific services]. It also emphasises [technology/methodology approach]. Its service model includes [business model details]."

RULES:
- Do NOT include the section title.
- ONE paragraph only, ~60 words.
- No bullet points.
${NARRATIVE_EXCLUSIONS}${TONE_RULES}`,

  'mission-vision': `Write ONE paragraph (~60 words) describing mission and vision.

USE THIS STRUCTURE:
"[Company] positions its mission around [mission focus], with an emphasis on [key values]. It envisions [vision/strategy for the future]."

RULES:
- Do NOT include the section title.
- ONE paragraph only, ~60 words.
- Use "positions its mission around" and "envisions" phrasing.
- No bullet points.
${NARRATIVE_EXCLUSIONS}${TONE_RULES}`,

  'system-description': `Write ONE paragraph (~80 words) describing the technical infrastructure.

USE THIS STRUCTURE:
"[Company] operates a [type of architecture] where [what flows] from [sources] through [network components], via [security/routing], to [destinations/segments]. External connectivity includes [integrations/platforms], and hosting includes [cloud/on-prem infrastructure]."

Use parentheticals for specifics: "(including X, Y, Z)".

RULES:
- Do NOT include the section title.
- ONE paragraph only, ~80 words.
- Describe the FLOW of data/operations through infrastructure.
- No bullet points.
${NARRATIVE_EXCLUSIONS}${TONE_RULES}`,

  'critical-vendors': `List the company's critical vendors for the SOC 2 audit report from the VENDORS TAB provided in the sources.

Include EVERY vendor listed in the VENDORS TAB. Do NOT shorten the list, do NOT omit any vendor, and do NOT add vendors that are not in the VENDORS TAB.

For each vendor, classify it as SaaS, PaaS, or IaaS and add a short description of its function.

FORMAT — one vendor per line:
[Vendor Name] - [SaaS/PaaS/IaaS] - ([brief function])

EXAMPLE:
Vercel - PaaS - (Application hosting)
AWS - IaaS - (Cloud infrastructure)
Slack - SaaS - (Team messaging)

RULES:
- Do NOT include the section title.
- One vendor per line, in the exact format above.
- The VENDORS TAB is the source of truth for which vendors to list — include all of them, invent none.
${TONE_RULES}`,

  'subservice-organizations': `Identify the subservice organisations for the SOC 2 report, choosing ONLY from the VENDORS TAB provided in the sources.

A subservice organisation is a cloud hosting / infrastructure provider (IaaS/PaaS) whose platform hosts the company's in-scope application and/or its data — compute, application hosting, managed database, or infrastructure. Typical examples: AWS, Microsoft Azure, Google Cloud Platform, Vercel, Neon, Render, Fly.io.

NEVER include:
- Identity / SSO / internal sign-in tools (e.g. Google Workspace, Okta, Microsoft Entra ID, Microsoft 365) — even when cloud-based.
- General SaaS tools the company merely uses (chat, email, AI APIs, CRM, finance, source control, documentation, monitoring, analytics).

Choose only vendors that appear in the VENDORS TAB. If NO vendor in the VENDORS TAB is a hosting/infrastructure provider, return an empty list — do NOT invent one.

FORMAT:
Subservice organisations: [Name1], [Name2], ...

If none qualify: "Subservice organisations: none"

EXAMPLE:
Subservice organisations: Google Cloud Platform

RULES:
- Do NOT include the section title.
- Use the "Subservice organisations:" prefix.
- List only hosting/infrastructure provider names taken from the VENDORS TAB.
${TONE_RULES}`,
};

export const AUDITOR_SYSTEM_PROMPT = `You are an expert at extracting and organizing company information for audit purposes.

CRITICAL RULES:
1. ONLY use information EXPLICITLY stated in the provided sources.
2. DO NOT make up, infer, or hallucinate ANY information.
3. DO NOT add generic industry information not explicitly mentioned.
4. Write in third person and simple present tense.
5. Be concise and factual.

ABSOLUTELY FORBIDDEN:
- NEVER say "information not found", "not available", "no data provided", "could not be determined", or ANY similar phrases.
- NEVER use hedging words: "may", "might", "likely", "appears", "seems".
- NEVER use attribution phrases: "according to", "the website states", "documentation notes".
- NEVER state employee counts/headcount or name individuals or their roles/titles in the narrative sections.
- If information is not available, simply OMIT that topic and write about what IS available.
- Always produce substantive content based on what you CAN find.`;

/**
 * Formats the org's Vendors tab into a plain-text block for the prompt. Lists
 * EVERY vendor so the model can reproduce the full list — CS-589: the critical
 * vendors list was coming back too small because the structured Vendors tab was
 * never passed (only the website scrape + Q&A were).
 */
export function buildVendorsBlock(vendors: VendorTabEntry[]): string {
  if (vendors.length === 0) {
    return 'No vendors are recorded in the Vendors tab.';
  }

  return vendors
    .map((vendor) => {
      const details = [vendor.category, vendor.description]
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part));
      const detailText = details.length > 0 ? ` — ${details.join(' — ')}` : '';
      const websiteSuffix = vendor.website?.trim() ? ` (${vendor.website.trim()})` : '';
      return `- ${vendor.name.trim()}${detailText}${websiteSuffix}`;
    })
    .join('\n');
}

/**
 * Assembles the user prompt for a section, including the full Vendors tab so the
 * critical-vendors and subservice sections work from the structured vendor list
 * rather than only the website scrape + Q&A.
 */
export function buildSectionUserPrompt({
  section,
  organization,
  websiteContent,
  contextHubText,
  vendorsBlock,
}: {
  section: Section;
  organization: { name: string; website: string };
  websiteContent: string;
  contextHubText: string;
  vendorsBlock: string;
}): string {
  return `${sectionPrompts[section]}

Company: ${organization.name}
Website: ${organization.website}

=== WEBSITE CONTENT ===
${websiteContent}

=== VENDORS TAB (every vendor the company has added) ===
${vendorsBlock}

=== ORGANIZATION CONTEXT ===
${contextHubText || 'No additional context.'}

=== END OF SOURCES ===

Generate the content based on the sources above. Write substantively about what you find - never mention missing information:`;
}
