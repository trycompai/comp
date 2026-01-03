import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Button, Heading, PageHeader, Stack } from '@trycompai/ui-shadcn';
import { Download, Plus, Settings } from 'lucide-react';

const meta = {
  title: 'Molecules/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
    description: 'Overview of your account and recent activity.',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Projects',
    description: 'Manage your projects and team collaborations.',
    actions: <Button iconLeft={<Plus />}>New Project</Button>,
  },
};

export const WithMultipleActions: Story = {
  args: {
    title: 'Reports',
    description: 'Generate and download reports for your data.',
    actions: (
      <Stack direction="row" gap="2">
        <Button variant="outline" iconLeft={<Download />}>
          Export
        </Button>
        <Button iconLeft={<Plus />}>New Report</Button>
      </Stack>
    ),
  },
};

export const WithMeta: Story = {
  args: {
    title: 'User Management',
    description: 'View and manage all users in your organization.',
    meta: 'Last updated 5 minutes ago',
    actions: (
      <Stack direction="row" gap="2">
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
        <Button iconLeft={<Plus />}>Add User</Button>
      </Stack>
    ),
  },
};

export const ProjectPage: Story = {
  args: {
    title: 'Project Alpha',
    description: 'A comprehensive design system for modern web applications.',
    meta: 'Created on Jan 15, 2024 • 12 team members',
    actions: (
      <Stack direction="row" gap="2">
        <Button variant="outline">Share</Button>
        <Button variant="outline">Settings</Button>
        <Button>Open Project</Button>
      </Stack>
    ),
  },
};

export const WithBadge: Story = {
  args: {
    title: 'Project Settings',
    description: 'Manage project configuration and team access.',
  },
  render: (args) => (
    <div>
      <Stack direction="row" gap="4" align="center">
        <Heading level="1">Project Alpha</Heading>
        <Badge variant="secondary">In Progress</Badge>
      </Stack>
      <PageHeader {...args} actions={<Button>Save Changes</Button>} />
    </div>
  ),
};
