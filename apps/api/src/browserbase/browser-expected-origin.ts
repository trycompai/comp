import type { BrowserbaseSessionService } from './browserbase-session.service';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;
export type ActivePage = Awaited<
  ReturnType<BrowserbaseSessionService['ensureActivePage']>
>;
type ActiveFrame = ReturnType<ActivePage['frames']>[number];

/** Only https on its default port may hold a stored credential. */
const HTTPS_PORTS = ['', '443'];
const HREF_PROBE = 'location.href';
const PASSWORD_FIELD_PROBE = "!!document.querySelector('input[type=password]')";

/**
 * Thrown when a stored secret is about to be typed onto a page that is not the
 * connection's own site. Carries the host it saw — for the run log and the
 * support breadcrumb — never the value it was about to type.
 */
export class UnexpectedPageOriginError extends Error {
  readonly code = 'unexpected_page_origin';
  readonly expectedOrigin: string;
  readonly actualUrl: string;
  readonly frameUrl?: string;

  constructor({
    expectedOrigin,
    actualUrl,
    frameUrl,
  }: {
    expectedOrigin: string;
    actualUrl: string;
    frameUrl?: string;
  }) {
    const where = frameUrl ?? actualUrl ?? 'no readable page';
    super(
      `Refusing to enter saved credentials: the browser is on ${where} but they belong to ${expectedOrigin}.`,
    );
    this.name = 'UnexpectedPageOriginError';
    this.expectedOrigin = expectedOrigin;
    this.actualUrl = actualUrl;
    this.frameUrl = frameUrl;
  }
}

/** Lowercased host without one trailing dot, or null when the URL can never
 *  hold a credential (http, non-default port, file/about/javascript/data). */
function credentialHost(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!HTTPS_PORTS.includes(url.port)) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  return host.length > 0 ? host : null;
}

/** `www.vendor.com` and `vendor.com` are the same site to a human but not to a
 *  string, so the family is built from the apex form. */
function apexHost(host: string): string {
  return host.startsWith('www.') ? host.slice('www.'.length) : host;
}

/** The connection's own site — `https://<profile hostname>`, taken from the
 *  stored connection, never from the page the browser happens to be on. */
export function expectedOriginOf(hostname: string): string {
  return `https://${hostname}`;
}

/**
 * The host a credential may be typed on, or null when it must not be typed at
 * all. Allowed: `<profile host>`, its `www.` twin, and any sub-host of the
 * profile's host (`login.`, `signin.`, `auth.`, …). No public-suffix list, so a
 * profile stored from a deep host stays narrow to that host's own sub-hosts.
 */
export function allowedCredentialHost({
  url,
  expectedOrigin,
}: {
  url: string;
  expectedOrigin: string;
}): string | null {
  const host = credentialHost(url);
  const expected = credentialHost(expectedOrigin);
  if (!host || !expected) return null;

  const apex = apexHost(expected);
  if (apex.length === 0) return null;

  for (const site of [apex, `www.${apex}`]) {
    if (host === site || host.endsWith(`.${site}`)) return host;
  }
  return null;
}

/** The newest open tab — the same selection the classifier and the sign-in
 *  navigator use, so the guard inspects the page act() will drive. */
export function activePage(stagehand: Stagehand): ActivePage | null {
  const pages = stagehand.context?.pages?.() ?? [];
  return pages[pages.length - 1] ?? null;
}

async function frameHref(frame: ActiveFrame): Promise<string | null> {
  try {
    const href = await frame.evaluate<string | null>(HREF_PROBE);
    return typeof href === 'string' ? href : null;
  } catch {
    // Detached or unreadable frame — nothing can be typed into it either.
    return null;
  }
}

async function holdsPasswordField(frame: ActiveFrame): Promise<boolean> {
  try {
    return await frame.evaluate<boolean>(PASSWORD_FIELD_PROBE);
  } catch {
    return false;
  }
}

/**
 * A page can embed another site (a support widget, an identity form). act()
 * drives the accessibility tree, which can include child frames, so a
 * cross-origin frame holding a password field is where a secret could land
 * without the top-level URL ever showing it.
 */
async function assertFramesOnExpectedOrigin({
  page,
  expectedOrigin,
  pageUrl,
}: {
  page: ActivePage;
  expectedOrigin: string;
  pageUrl: string;
}): Promise<void> {
  const frames = page.frames();
  for (const frame of frames) {
    const href = await frameHref(frame);
    if (!href) continue;
    if (allowedCredentialHost({ url: href, expectedOrigin })) continue;
    if (!(await holdsPasswordField(frame))) continue;
    throw new UnexpectedPageOriginError({
      expectedOrigin,
      actualUrl: pageUrl,
      frameUrl: href,
    });
  }
}

/**
 * Must be awaited IMMEDIATELY before every act() that carries a secret. Resolves
 * the page act() will act on, verifies it is https on the connection's own host
 * family, verifies no cross-origin frame holds a password field, and returns the
 * page so the caller can pin it with act(..., { page }).
 *
 * Standalone because act() cannot be made atomic: this narrows the check-to-fill
 * window to the model call itself, and the caller fails closed on any refusal.
 */
export async function assertPageOnExpectedOrigin({
  stagehand,
  expectedOrigin,
  page,
}: {
  stagehand: Stagehand;
  expectedOrigin: string;
  /** Optional explicit page when the caller already holds one. */
  page?: ActivePage;
}): Promise<ActivePage> {
  const target = page ?? activePage(stagehand);
  if (!target) {
    throw new UnexpectedPageOriginError({ expectedOrigin, actualUrl: '' });
  }

  const pageUrl = target.url();
  if (!allowedCredentialHost({ url: pageUrl, expectedOrigin })) {
    throw new UnexpectedPageOriginError({ expectedOrigin, actualUrl: pageUrl });
  }

  await assertFramesOnExpectedOrigin({ page: target, expectedOrigin, pageUrl });
  return target;
}

/**
 * Types one stored value: the check runs first, so on a refusal nothing is
 * handed to Stagehand and no secret reaches the page, then the verified page is
 * pinned for that one act.
 */
export async function enterSecretField({
  stagehand,
  expectedOrigin,
  instruction,
  variables,
}: {
  stagehand: Stagehand;
  expectedOrigin: string;
  instruction: string;
  variables: Record<string, string>;
}): Promise<void> {
  const page = await assertPageOnExpectedOrigin({ stagehand, expectedOrigin });
  await stagehand.act(instruction, { variables, page });
}
