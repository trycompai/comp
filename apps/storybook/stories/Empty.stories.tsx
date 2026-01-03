import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Stack,
} from '@trycompai/ui-shadcn';
import { FileX, Inbox, Search, Users } from 'lucide-react';

const meta = {
  title: 'Molecules/Empty',
  component: Empty,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>No messages</EmptyTitle>
        <EmptyDescription>You don't have any messages yet.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileX />
        </EmptyMedia>
        <EmptyTitle>No documents</EmptyTitle>
        <EmptyDescription>Get started by creating a new document.</EmptyDescription>
      </EmptyHeader>
      <Button>Create Document</Button>
    </Empty>
  ),
};

export const SearchNoResults: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>
          Try adjusting your search or filters to find what you're looking for.
        </EmptyDescription>
      </EmptyHeader>
      <Button variant="outline">Clear Filters</Button>
    </Empty>
  ),
};

export const NoTeamMembers: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>No team members</EmptyTitle>
        <EmptyDescription>Invite people to collaborate on this project.</EmptyDescription>
      </EmptyHeader>
      <Stack direction="row" gap="2">
        <Button>Invite Members</Button>
        <Button variant="outline">Learn More</Button>
      </Stack>
    </Empty>
  ),
};
