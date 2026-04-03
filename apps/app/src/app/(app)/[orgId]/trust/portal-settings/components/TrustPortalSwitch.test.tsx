import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({
    updateToggleSettings: vi.fn(),
    updateFrameworkSettings: vi.fn(),
    uploadComplianceResource: vi.fn(),
    getComplianceResourceUrl: vi.fn(),
    saveOverview: vi.fn(),
    updateAllowedDomains: vi.fn(),
    updateVendorTrustSettings: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({ put: vi.fn() }),
}));

vi.mock('@/hooks/use-trust-portal-custom-links', () => ({
  useTrustPortalCustomLinks: () => ({
    createLink: vi.fn(),
    updateLink: vi.fn(),
    deleteLink: vi.fn(),
    reorderLinks: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-trust-portal-documents', () => ({
  useTrustPortalDocuments: () => ({
    documents: [],
    uploadDocument: vi.fn(),
    downloadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  }),
}));

vi.mock('@/components/file-uploader', () => ({
  FileUploader: () => <div data-testid="file-uploader" />,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() },
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock('remark-gfm', () => ({
  default: vi.fn(),
}));

// Mock @dnd-kit modules
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

// Mock design system
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick, disabled, iconLeft, iconRight, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{iconLeft}{children}{iconRight}</button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  DropdownMenuTrigger: ({ children }: any) => <button>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Select: ({ children, disabled }: any) => <div data-disabled={disabled}>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
  Switch: ({ checked, disabled, onCheckedChange }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      data-testid="switch"
    />
  ),
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button role="tab" data-value={value}>{children}</button>,
  Textarea: (props: any) => <textarea {...props} />,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children, render }: any) => render || <div>{children}</div>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span />,
  ChevronLeft: () => <span />,
  ChevronRight: () => <span />,
  Close: () => <span />,
  Edit: () => <span />,
  Link: () => <span />,
  OverflowMenuVertical: () => <span />,
  TrashCan: () => <span />,
  View: () => <span />,
  ViewOff: () => <span />,
}));

vi.mock('lucide-react', () => ({
  ChevronDown: () => <span />,
  ChevronUp: () => <span />,
  Download: () => <span />,
  Eye: () => <span />,
  FileCheck2: () => <span />,
  FileText: () => <span />,
  GripVertical: () => <span />,
  Loader2: () => <span />,
  Plus: () => <span />,
  Save: () => <span />,
  Trash2: () => <span />,
  Upload: () => <span />,
}));

vi.mock('./logos', () => ({
  GDPR: () => <span />,
  HIPAA: () => <span />,
  ISO27001: () => <span />,
  ISO42001: () => <span />,
  ISO9001: () => <span />,
  NEN7510: () => <span />,
  PCIDSS: () => <span />,
  SOC2Type1: () => <span />,
  SOC2Type2: () => <span />,
}));

vi.mock('./UpdateTrustFavicon', () => ({
  UpdateTrustFavicon: () => <div data-testid="update-trust-favicon" />,
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    <img alt={props.alt as string} src={props.src as string} />
  ),
}));

import { TrustPortalSwitch } from './TrustPortalSwitch';

describe('TrustPortalSwitch permission gating', () => {
  const defaultProps = {
    enabled: true,
    slug: 'test-org',
    domainVerified: true,
    domain: 'trust.example.com',
    contactEmail: 'test@example.com',
    primaryColor: '#000000',
    orgId: 'org-1',
    soc2type1: false,
    soc2type2: false,
    iso27001: true,
    iso42001: false,
    gdpr: false,
    hipaa: false,
    pcidss: false,
    nen7510: false,
    soc2type1Status: 'started' as const,
    soc2type2Status: 'started' as const,
    iso27001Status: 'compliant' as const,
    iso42001Status: 'started' as const,
    gdprStatus: 'started' as const,
    hipaaStatus: 'started' as const,
    pcidssStatus: 'started' as const,
    nen7510Status: 'started' as const,
    iso9001: false,
    iso9001Status: 'started' as const,
    faqs: [],
    additionalDocuments: [],
    overview: {
      overviewTitle: null,
      overviewContent: null,
      showOverview: false,
    },
    customLinks: [],
    vendors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders framework tabs regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalSwitch {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /frameworks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /branding/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /mission/i })).toBeInTheDocument();
  });

  it('renders compliance framework titles regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalSwitch {...defaultProps} />);
    expect(screen.getByText('Compliance Frameworks')).toBeInTheDocument();
    expect(screen.getByText('ISO 27001')).toBeInTheDocument();
  });

  it('disables framework switches when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalSwitch {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    for (const sw of switches) {
      expect(sw).toBeDisabled();
    }
  });

  it('enables framework switches when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalSwitch {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    for (const sw of switches) {
      expect(sw).not.toBeDisabled();
    }
  });

  it('disables framework switches when user has no permissions', () => {
    setMockPermissions({});
    render(<TrustPortalSwitch {...defaultProps} />);
    const switches = screen.getAllByRole('switch');
    for (const sw of switches) {
      expect(sw).toBeDisabled();
    }
  });
});
