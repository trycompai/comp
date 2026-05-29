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
vi.mock('@trycompai/design-system', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

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

  it('renders the Statement of Applicability section', () => {
    render(<IsmsOverview organizationId="org-1" />);
    // SOAOverviewCard renders "Statement of Applicability" as its section title + card title.
    expect(screen.getAllByText('Statement of Applicability').length).toBeGreaterThan(0);
  });

  it('links the Context of the Organization card to its detail page', () => {
    render(<IsmsOverview organizationId="org-1" />);
    const contextLink = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href')?.includes('/documents/isms/context-of-organization'));
    expect(contextLink).toBeDefined();
  });

  it('marks the not-yet-implemented documents as Coming soon', () => {
    render(<IsmsOverview organizationId="org-1" />);
    // Five of the six cards are not implemented yet.
    expect(screen.getAllByText('Coming soon')).toHaveLength(5);
  });
});
