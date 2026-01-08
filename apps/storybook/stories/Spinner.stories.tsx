import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner, Stack, Text } from '@trycompai/design-system';

const meta = {
  title: 'Atoms/Spinner',
  component: Spinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Spinner />,
};

export const WithText: Story = {
  render: () => (
    <Stack direction="row" gap="2" align="center">
      <Spinner />
      <Text size="sm">Loading...</Text>
    </Stack>
  ),
};

export const InButton: Story = {
  render: () => (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md">
      <Spinner />
      <span className="text-sm">Processing...</span>
    </div>
  ),
};

export const CenteredLoading: Story = {
  render: () => (
    <div className="flex items-center justify-center h-32 w-64 border rounded-md">
      <Stack align="center" gap="2">
        <Spinner />
        <Text size="sm" variant="muted">
          Loading content...
        </Text>
      </Stack>
    </div>
  ),
};
