import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Track automation status filter state for assertions
let automationStatusValue: string | null = null;
const mockSetAutomationStatus = vi.fn((val: string | null) => {
  automationStatusValue = val;
});

// Mock nuqs
vi.mock('nuqs', () => ({
  useQueryState: (key: string) => {
    if (key === 'automationStatus') return [automationStatusValue, mockSetAutomationStatus];
    return [null, vi.fn()];
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_123' }),
}));

// Mock child components
vi.mock('./ModernTaskList', () => ({
  ModernTaskList: ({ tasks }: { tasks: { id: string }[] }) => (
    <div data-testid="modern-task-list">
      {tasks.map((t) => (
        <div key={t.id} data-testid={`task-${t.id}`} />
      ))}
    </div>
  ),
}));

vi.mock('./TasksByCategory', () => ({
  TasksByCategory: ({ tasks }: { tasks: { id: string }[] }) => (
    <div data-testid="tasks-by-category">
      {tasks.map((t) => (
        <div key={t.id} data-testid={`cat-task-${t.id}`} />
      ))}
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: () => <span />,
  Circle: () => <span />,
  FolderTree: () => <span />,
  List: () => <span />,
  Search: () => <span />,
  XCircle: () => <span />,
}));

// Mock design-system components
vi.mock('@trycompai/design-system', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => <img />,
  HStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputGroupAddon: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputGroupInput: (props: Record<string, unknown>) => <input {...props} />,
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid={`select-${value}`}>
      {children}
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        data-testid={`select-native-${value}`}
      >
        {/* Placeholder so the native select works */}
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <option value={value} data-testid={`select-item-${value}`}>
      {children}
    </option>
  ),
  SelectTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    size?: string;
    disabled?: boolean;
  }) => <div>{children}</div>,
  SelectValue: ({
    children,
  }: {
    children: React.ReactNode;
    placeholder?: string;
  }) => <div>{children}</div>,
  Separator: () => <hr />,
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tabs: ({
    children,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode; value?: string }) => (
    <div>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode; variant?: string }) => (
    <div>{children}</div>
  ),
  TabsTrigger: ({ children }: { children: React.ReactNode; value?: string }) => (
    <div>{children}</div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { TaskList } from './TaskList';

const baseMockTask = {
  description: 'Test',
  status: 'todo' as const,
  frequency: null,
  department: null,
  assigneeId: null,
  organizationId: 'org_123',
  createdAt: new Date(),
  updatedAt: new Date(),
  order: 0,
  taskTemplateId: null,
  reviewDate: null,
  approvalStatus: null,
  approverId: null,
  approvedAt: null,
  approvalComment: null,
  controls: [] as { id: string; name: string }[],
};

const automatedTask = {
  ...baseMockTask,
  id: 'task_auto_1',
  title: 'Automated Task',
  automationStatus: 'AUTOMATED' as const,
};

const manualTask = {
  ...baseMockTask,
  id: 'task_manual_1',
  title: 'Manual Task',
  automationStatus: 'MANUAL' as const,
};

const defaultProps = {
  tasks: [automatedTask, manualTask],
  members: [],
  frameworkInstances: [],
  activeTab: 'list' as const,
  evidenceApprovalEnabled: false,
};

describe('TaskList automation status filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    automationStatusValue = null;
  });

  it('renders the automation status filter dropdown', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getAllByText('All types').length).toBeGreaterThan(0);
  });

  it('shows all tasks when no automation status filter is active', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByTestId('task-task_auto_1')).toBeInTheDocument();
    expect(screen.getByTestId('task-task_manual_1')).toBeInTheDocument();
  });

  it('shows only automated tasks when AUTOMATED filter is active', () => {
    automationStatusValue = 'AUTOMATED';
    render(<TaskList {...defaultProps} />);
    expect(screen.getByTestId('task-task_auto_1')).toBeInTheDocument();
    expect(screen.queryByTestId('task-task_manual_1')).not.toBeInTheDocument();
  });

  it('shows only manual tasks when MANUAL filter is active', () => {
    automationStatusValue = 'MANUAL';
    render(<TaskList {...defaultProps} />);
    expect(screen.queryByTestId('task-task_auto_1')).not.toBeInTheDocument();
    expect(screen.getByTestId('task-task_manual_1')).toBeInTheDocument();
  });

  it('displays result count when automation status filter is active', () => {
    automationStatusValue = 'AUTOMATED';
    render(<TaskList {...defaultProps} />);
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('renders Automated and Manual options in the dropdown', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getAllByTestId('select-item-AUTOMATED')).toHaveLength(1);
    expect(screen.getAllByTestId('select-item-MANUAL')).toHaveLength(1);
  });

  it('renders All types text in the dropdown', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getAllByText('All types').length).toBeGreaterThan(0);
  });
});
