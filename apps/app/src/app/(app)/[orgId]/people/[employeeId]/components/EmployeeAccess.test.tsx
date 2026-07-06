import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeAccess } from './EmployeeAccess';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('@/lib/api-client', () => ({ apiClient: { get: mockGet } }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const source = (overrides: object) => ({
  slug: 'google-workspace',
  name: 'Google Workspace',
  logoUrl: null,
  matchType: 'matched',
  entries: [{ summary: 'Super Admin', fields: { Role: 'Super Admin' }, raw: {} }],
  lastCheckedAt: '2026-07-01T00:00:00Z',
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe('EmployeeAccess', () => {
  it('lists integrations with the member access summary and match state', async () => {
    mockGet.mockResolvedValue({
      data: { data: { memberId: 'mem_1', sources: [source({}), source({ slug: 'okta', name: 'Okta', matchType: 'not-matched', entries: [] })] } },
    });

    render(<EmployeeAccess memberId="mem_1" organizationId="org_1" />);

    await waitFor(() => expect(screen.getByText('Google Workspace')).toBeInTheDocument());
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Access found')).toBeInTheDocument();
    expect(screen.getByText('No match for this member')).toBeInTheDocument();
  });

  it('labels sources whose checks produce no per-person rows', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          memberId: 'mem_3',
          sources: [source({ matchType: 'no-person-data', entries: [] })],
        },
      },
    });

    render(<EmployeeAccess memberId="mem_3" organizationId="org_1" />);

    await waitFor(() => expect(screen.getByText('No per-person data')).toBeInTheDocument());
  });

  it('expands a matched source to show fields and the raw record', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: {
          memberId: 'mem_4',
          sources: [
            source({
              entries: [
                { summary: 'Editor seat', fields: { Role: 'Editor' }, raw: { role: 'editor' } },
              ],
            }),
          ],
        },
      },
    });

    render(<EmployeeAccess memberId="mem_4" organizationId="org_1" />);

    await waitFor(() => expect(screen.getByText('Google Workspace')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Google Workspace/ }));

    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Raw record')).toBeInTheDocument();
  });

  it('shows the connect empty state when no integration reports access', async () => {
    mockGet.mockResolvedValue({ data: { data: { memberId: 'mem_2', sources: [] } } });

    render(<EmployeeAccess memberId="mem_2" organizationId="org_1" />);

    await waitFor(() =>
      expect(
        screen.getByText('No connected integrations report employee access yet.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('Browse integrations →')).toHaveAttribute(
      'href',
      '/org_1/integrations',
    );
  });
});
