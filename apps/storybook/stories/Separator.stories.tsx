import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator, Stack, Text } from '@trycompai/design-system';

const meta = {
  title: 'Atoms/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[300px]">
      <Text>Above the separator</Text>
      <div className="my-4">
        <Separator />
      </div>
      <Text>Below the separator</Text>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-4">
      <Text>Left</Text>
      <Separator orientation="vertical" />
      <Text>Right</Text>
    </div>
  ),
};

export const InList: Story = {
  render: () => (
    <div className="w-[300px] rounded-md border">
      <Stack gap="0">
        <div className="p-4">
          <Text weight="medium">Item 1</Text>
          <Text size="sm" variant="muted">
            Description for item 1
          </Text>
        </div>
        <Separator />
        <div className="p-4">
          <Text weight="medium">Item 2</Text>
          <Text size="sm" variant="muted">
            Description for item 2
          </Text>
        </div>
        <Separator />
        <div className="p-4">
          <Text weight="medium">Item 3</Text>
          <Text size="sm" variant="muted">
            Description for item 3
          </Text>
        </div>
      </Stack>
    </div>
  ),
};
