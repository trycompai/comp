/**
 * Well-known framework name patterns used in task descriptions.
 * Each entry maps a canonical label (used in "For <label>:" paragraphs)
 * to the possible names stored in FrameworkEditorFramework.name.
 *
 * Matching is case-insensitive.
 */
const FRAMEWORK_ALIASES: Record<string, string[]> = {
  'soc 2': ['soc 2', 'soc2', 'soc 2 v.1'],
  'iso 27001': ['iso 27001', 'iso27001'],
  'iso 42001': ['iso 42001', 'iso42001'],
  'iso 9001': ['iso 9001', 'iso9001'],
  hipaa: ['hipaa'],
  gdpr: ['gdpr'],
  'pci dss': ['pci dss', 'pci', 'pci v0', 'example pci'],
  'nen 7510': ['nen 7510', 'nen7510'],
  'nist csf': ['nist csf'],
  'nist 800-53': ['nist 800-53'],
  'nis 2': ['nis 2', 'nis2'],
};

/**
 * Regex that matches a paragraph that starts with a framework-specific
 * prefix such as "For ISO 27001:" or "For HIPAA:".
 *
 * Capture group 1 = framework label (e.g. "ISO 27001", "PCI").
 *
 * The pattern is intentionally broad: it catches "For <words>:" at the
 * beginning of a paragraph (after optional whitespace / newlines).
 */
const FOR_FRAMEWORK_LINE_RE =
  /^[ \t]*For\s+([A-Za-z0-9][A-Za-z0-9 .\-/]*?)\s*:/im;
const COMPOSITE_LABEL_SEPARATOR_RE = /\s*(?:,|\/|&|\band\b)\s*/i;

/**
 * Normalise a framework name for comparison.
 */
function normalise(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Build a Set of normalised active framework labels from the org's
 * framework instance names. We expand each name through the alias map
 * so that both the canonical label and the DB name are included.
 */
function buildActiveLabels(activeFrameworkNames: string[]): Set<string> {
  const labels = new Set<string>();

  for (const name of activeFrameworkNames) {
    const normName = normalise(name);
    labels.add(normName);

    // Also add canonical labels that match this name
    for (const [canonical, aliases] of Object.entries(FRAMEWORK_ALIASES)) {
      if (aliases.some((a) => normalise(a) === normName)) {
        labels.add(normalise(canonical));
        for (const alias of aliases) {
          labels.add(normalise(alias));
        }
      }
    }
  }

  return labels;
}

/**
 * Check whether a framework label extracted from a "For <label>:" line
 * matches one of the active frameworks.
 */
function isLabelActive(label: string, activeLabels: Set<string>): boolean {
  const normLabel = normalise(label);
  const aliasEntries = Object.entries(FRAMEWORK_ALIASES);

  // Direct match
  if (activeLabels.has(normLabel)) return true;

  // Check alias map: if the label is a known canonical key or alias,
  // see if any of its counterparts are in the active set.
  for (const [canonical, aliases] of aliasEntries) {
    const allNames = [canonical, ...aliases].map(normalise);
    if (allNames.includes(normLabel)) {
      return allNames.some((n) => activeLabels.has(n));
    }
  }

  // Handle headers like "For ISO 27001 and HIPAA:"
  const parts = normLabel
    .split(COMPOSITE_LABEL_SEPARATOR_RE)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    let hasKnownPart = false;
    let hasUnknownPart = false;
    let anyKnownPartIsActive = false;

    for (const part of parts) {
      if (activeLabels.has(part)) {
        hasKnownPart = true;
        anyKnownPartIsActive = true;
        continue;
      }

      const matchingAliasEntry = aliasEntries.find(([canonical, aliases]) => {
        const allNames = [canonical, ...aliases].map(normalise);
        return allNames.includes(part);
      });

      if (!matchingAliasEntry) {
        hasUnknownPart = true;
        continue;
      }

      hasKnownPart = true;
      const [canonical, aliases] = matchingAliasEntry;
      const allNames = [canonical, ...aliases].map(normalise);
      if (allNames.some((name) => activeLabels.has(name))) {
        anyKnownPartIsActive = true;
      }
    }

    if (hasKnownPart && !hasUnknownPart) {
      return anyKnownPartIsActive;
    }
  }

  // Unknown label - keep it visible (safe default)
  return true;
}

/**
 * Filter framework-specific paragraphs from a task description.
 *
 * Paragraphs starting with "For <FrameworkName>:" are removed if the
 * framework is not among the organisation's active frameworks.
 *
 * @returns The filtered description string.
 */
export function filterDescriptionByFrameworks(
  description: string,
  activeFrameworkNames: string[],
): string {
  if (!description) return description;
  if (activeFrameworkNames.length === 0) return description;

  const activeLabels = buildActiveLabels(activeFrameworkNames);

  // Split description into paragraphs (double-newline separated)
  const paragraphs = description.split(/\n\n+/);
  let pendingHeaderIsActive: boolean | null = null;

  const filtered = paragraphs.filter((paragraph) => {
    if (pendingHeaderIsActive !== null) {
      const shouldKeep = pendingHeaderIsActive;
      pendingHeaderIsActive = null;
      return shouldKeep;
    }

    const match = paragraph.match(FOR_FRAMEWORK_LINE_RE);
    if (!match) return true; // Not a framework-specific paragraph

    const label = match[1];
    const isActive = isLabelActive(label, activeLabels);

    // Handle seed data format where header and section content are split:
    // "For GDPR:\n\n<framework-specific paragraph>"
    const paragraphWithoutPrefix = paragraph
      .replace(FOR_FRAMEWORK_LINE_RE, '')
      .trim();
    if (!paragraphWithoutPrefix) {
      pendingHeaderIsActive = isActive;
    }

    return isActive;
  });

  return filtered.join('\n\n').trim();
}
