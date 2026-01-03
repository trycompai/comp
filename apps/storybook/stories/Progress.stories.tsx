import type { Meta, StoryObj } from '@storybook/react-vite';
import { Progress, Stack, Text } from '@trycompai/ui-shadcn';

const meta = {
  title: 'Atoms/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 33 },
  render: (args) => (
    <div className="w-[300px]">
      <Progress {...args} />
    </div>
  ),
};

export const Empty: Story = {
  args: { value: 0 },
  render: (args) => (
    <div className="w-[300px]">
      <Progress {...args} />
    </div>
  ),
};

export const Half: Story = {
  args: { value: 50 },
  render: (args) => (
    <div className="w-[300px]">
      <Progress {...args} />
    </div>
  ),
};

export const Complete: Story = {
  args: { value: 100 },
  render: (args) => (
    <div className="w-[300px]">
      <Progress {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  args: { value: 66 },
  render: (args) => (
    <div className="w-[300px]">
      <Stack gap="2">
        <div className="flex justify-between">
          <Text size="sm">Progress</Text>
          <Text size="sm" variant="muted">
            66%
          </Text>
        </div>
        <Progress {...args} />
      </Stack>
    </div>
  ),
};

export const Steps: Story = {
  args: { value: 25 },
  render: () => (
    <div className="w-[300px]">
      <Stack gap="4">
        <Stack gap="2">
          <Text size="sm">Step 1 of 4</Text>
          <Progress value={25} />
        </Stack>
        <Stack gap="2">
          <Text size="sm">Step 2 of 4</Text>
          <Progress value={50} />
        </Stack>
        <Stack gap="2">
          <Text size="sm">Step 3 of 4</Text>
          <Progress value={75} />
        </Stack>
        <Stack gap="2">
          <Text size="sm">Step 4 of 4</Text>
          <Progress value={100} />
        </Stack>
      </Stack>
    </div>
  ),
};
