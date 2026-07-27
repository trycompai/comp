export interface ExistingItemRaw {
  id: string;
  name: string;
  controlTemplates?: Array<{
    id: string;
    name: string;
    requirements?: Array<{ framework?: { id: string; name: string | null } | null }>;
  }>;
  requirements?: Array<{ framework?: { id: string; name: string | null } | null }>;
}

// apiClient throws Error(<raw response body>); pull the NestJS `message`
// field out so the user sees e.g. "Framework has no requirements to link
// the control to" instead of a generic failure.
export function extractApiErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error) || !error.message) return null;
  try {
    const parsed: unknown = JSON.parse(error.message);
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      const message = (parsed as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
  } catch {
    // Not JSON — fall through to the raw message.
  }
  return error.message;
}

// Frameworks an item already belongs to (shown as badges), derived from the
// frameworks of its linked requirements.
export function extractFrameworkNames(item: ExistingItemRaw): string[] {
  const names = new Set<string>();

  for (const ct of item.controlTemplates ?? []) {
    for (const req of ct.requirements ?? []) {
      if (req.framework?.name) names.add(req.framework.name);
    }
  }
  for (const req of item.requirements ?? []) {
    if (req.framework?.name) names.add(req.framework.name);
  }

  return Array.from(names);
}
