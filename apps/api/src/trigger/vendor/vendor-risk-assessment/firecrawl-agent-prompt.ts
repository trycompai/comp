/**
 * Builds the Firecrawl Agent prompt for core vendor risk research.
 *
 * Design intent: URL discovery is the primary goal, not certification
 * extraction. The Agent often encounters JavaScript-only trust portals
 * (e.g. Ubiquiti) whose markdown is empty until a browser executes it —
 * if that happens, the Agent should still return the URL so the
 * downstream `deepScrapeTrustPortal` orchestrator can handle SPA
 * rendering via scrape actions.
 */
export function buildFirecrawlAgentPrompt(params: {
  vendorName: string;
  vendorWebsite: string;
  vendorDomain: string;
}): string {
  const { vendorName, vendorWebsite, vendorDomain } = params;
  const vendorSlug = vendorName.toLowerCase().replace(/[^a-z0-9]+/g, '');

  return `You are researching the security posture of "${vendorName}" (${vendorWebsite}).

# Primary goal
Return a trust_center_url whenever the vendor has ANY trust, security, or compliance page — even if you cannot extract certification details from it. A downstream system will deep-scrape the URL you return. Your job is to FIND the URL reliably; extracting certifications yourself is a bonus, not a requirement.

# Search method

1. Start at ${vendorWebsite}. Scan the top-nav, footer, and any "Security", "Trust", "Legal", "Compliance", "Resources", or "About" menus.

2. If nothing is surfaced in the nav, DIRECTLY visit these common paths on ${vendorDomain} and confirm they exist:
   - /trust-center  /trust  /security  /compliance
   - /security-and-compliance  /trust/overview  /about/security
   - Also check subdomains: trust.${vendorDomain}, security.${vendorDomain}
   - Also check third-party portals: ${vendorSlug}.trust.page (SafeBase), ${vendorSlug}.safebase.io, ${vendorSlug}.vanta.com, ${vendorSlug}.drata.com

3. Some vendor trust centers are JavaScript SPAs that render empty HTML without browser execution. If a trust page loads but the markdown looks thin or only contains navigation chrome (no security content at all), that's a SPA — STILL return its URL as trust_center_url. Do not discard it because you can't see the content.

4. Many trust pages hide certifications behind tabs or sidebar sections (e.g. /trust-center#cloud-security on Ubiquiti, /trust-center/compliance). Visit as many sub-sections as you can; return any certifications you can extract from them.

# Extraction rules for certifications

Only return a certification when the page explicitly names a framework as current: SOC 2 Type I/II, ISO 27001/27017/27018/27701, ISO 42001, ISO 9001, FedRAMP, HIPAA, PCI DSS, GDPR, TISAX, CSA STAR, C5, NEN 7510. For each:
- status: "verified" when the page lists the framework as current (includes badge images, "we are certified", "compliant with X"). "expired" only if the page explicitly says so. "not_certified" only if the page explicitly says the vendor is NOT certified. "unknown" otherwise.
- Never invent a cert that isn't on the page. Never default to "not_certified".
- Include issued_at / expires_at dates only when printed on the page.

# Output contract (strict)

- links.trust_center_url — REQUIRED whenever any of these exist on the vendor's domain or a recognised third-party portal: a /trust*, /security*, /compliance* page; a trust. or security. subdomain; or a third-party trust portal. Return the best landing URL. Leave empty ONLY when you have confirmed no such page exists anywhere.
- links.privacy_policy_url, links.terms_of_service_url, links.security_page_url, links.soc2_report_url — return only when confirmed; otherwise empty.
- certifications — may be an empty array. Do NOT pad it.
- security_assessment — one paragraph summarising what you observed. If the trust portal was SPA-only and you could not read content, say so explicitly ("Trust portal at <url> appears to be a JavaScript SPA; deep-scrape will extract content").
- risk_level — your best estimate among critical/high/medium/low/very_low based on what you found.

Focus on ${vendorWebsite} and its trust/security/compliance paths. Only cite URLs on ${vendorDomain}, its subdomains, or a recognised third-party portal hosting this vendor's trust page.`;
}
