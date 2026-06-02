import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock api client ─────────────────────────────────────────
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// ─── Mock SWR (synchronous, key-aware) ───────────────────────
type SWRKey = readonly unknown[] | string | null;
vi.mock('swr', () => ({
  default: (key: SWRKey) => {
    if (Array.isArray(key) && key[0] === '/v1/frameworks') {
      return {
        data: {
          data: [{ id: 'fi-1', frameworkId: 'fw-iso', framework: { id: 'fw-iso', name: 'ISO 27001' } }],
        },
      };
    }
    if (Array.isArray(key) && key[0] === '/v1/isms/ensure-setup') {
      return {
        data: {
          success: true,
          documents: [
            { id: 'd1', type: 'context_of_organization', status: 'draft', requirementId: null, hasApprovedVersion: false },
          ],
        },
      };
    }
    if (Array.isArray(key) && key[2] === 'drift') {
      return { data: { isStale: false, changedSources: [] } };
    }
    // SOAOverviewCard's own ensure-setup
    return { data: { success: true, configuration: {}, document: null }, isLoading: false, error: null };
  },
}));

// ─── Mock design system ──────────────────────────────────────
type Kids = { children?: React.ReactNode };
vi.mock('@trycompai/design-system', () => ({
  Alert: ({ children }: Kids) => <div role="alert">{children}</div>,
  AlertTitle: ({ children }: Kids) => <strong>{children}</strong>,
  AlertDescription: ({ children }: Kids) => <div>{children}</div>,
  Spinner: () => <span role="status" aria-label="Loading" />,
  Badge: ({ children }: Kids) => <span>{children}</span>,
  Button: ({ children }: Kids) => <button type="button">{children}</button>,
  Card: ({ children }: Kids) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: Kids) => <div>{children}</div>,
  CardDescription: ({ children }: Kids) => <p>{children}</p>,
  CardHeader: ({ children }: Kids) => <div>{children}</div>,
  CardTitle: ({ children }: Kids) => <h3>{children}</h3>,
  Grid: ({ children }: Kids) => <div>{children}</div>,
  Heading: ({ children }: Kids) => <h2>{children}</h2>,
  HStack: ({ children }: Kids) => <div>{children}</div>,
  Stack: ({ children }: Kids) => <div>{children}</div>,
  Section: ({ title, description, actions, children }: Kids & {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <section>
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
      {actions}
      {children}
    </section>
  ),
  Text: ({ children }: Kids) => <span>{children}</span>,
  Empty: ({ children }: Kids) => <div>{children}</div>,
  EmptyContent: ({ children }: Kids) => <div>{children}</div>,
  EmptyDescription: ({ children }: Kids) => <p>{children}</p>,
  EmptyHeader: ({ children }: Kids) => <div>{children}</div>,
  EmptyMedia: ({ children }: Kids) => <div>{children}</div>,
  EmptyTitle: ({ children }: Kids) => <h3>{children}</h3>,
}));

// ─── Mock design-system icons ────────────────────────────────
vi.mock('@trycompai/design-system/icons', () => {
  const Icon = () => <svg />;
  return {
    ArrowLeft: Icon,
    ArrowRight: Icon,
    CheckmarkFilled: Icon,
    CircleDash: Icon,
    DocumentMultiple_01: Icon,
    Edit: Icon,
    Incomplete: Icon,
    MagicWand: Icon,
    Misuse: Icon,
    Renew: Icon,
    Time: Icon,
    WarningAlt: Icon,
    WarningAltFilled: Icon,
  };
});

// ─── Mock next/link ──────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { IsmsOverview } from './IsmsOverview';

describe('IsmsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 6 foundational document cards', () => {
    render(<IsmsOverview organizationId="org-1" />);

    expect(screen.getByText(/Context of the Organization/)).toBeInTheDocument();
    expect(screen.getByText(/Interested Parties Register/)).toBeInTheDocument();
    expect(screen.getByText(/Interested Parties Requirements/)).toBeInTheDocument();
    expect(screen.getByText(/ISMS Scope/)).toBeInTheDocument();
    expect(screen.getByText(/Leadership and Commitment/)).toBeInTheDocument();
    expect(screen.getByText(/Information Security Objectives and Plan/)).toBeInTheDocument();
  });

  it('renders the Foundational Documents section heading', () => {
    render(<IsmsOverview organizationId="org-1" />);
    expect(screen.getByText('Foundational Documents')).toBeInTheDocument();
  });

  it('does not render the Statement of Applicability (it lives in general documents)', () => {
    render(<IsmsOverview organizationId="org-1" />);
    // SOA was moved out of the ISMS tab back into the general documents list.
    expect(screen.queryByText('Statement of Applicability')).not.toBeInTheDocument();
  });

  it('links the Context of the Organization card to its detail page', () => {
    render(<IsmsOverview organizationId="org-1" />);
    const contextLink = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href')?.includes('/documents/isms/context-of-organization'));
    expect(contextLink).toBeDefined();
  });

  it('links all six foundational documents to their detail pages', () => {
    render(<IsmsOverview organizationId="org-1" />);
    // All six foundational documents are now implemented — none are "Coming soon".
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
    const ismsDetailLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('/documents/isms/'));
    expect(ismsDetailLinks).toHaveLength(6);
  });
});
