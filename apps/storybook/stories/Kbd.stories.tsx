import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd, Stack, Text } from '@trycompai/design-system';

const meta = {
  title: 'Atoms/Kbd',
  component: Kbd,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '⌘',
  },
};

export const SingleKey: Story = {
  args: {
    children: 'K',
  },
};

export const KeyCombination: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </div>
  ),
};

export const ShortcutList: Story = {
  render: () => (
    <div className="w-[300px]">
      <Stack gap="3">
        <div className="flex items-center justify-between">
          <Text size="sm">Search</Text>
          <div className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Text size="sm">Save</Text>
          <div className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>S</Kbd>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Text size="sm">Close</Text>
          <Kbd>Esc</Kbd>
        </div>
        <div className="flex items-center justify-between">
          <Text size="sm">Copy</Text>
          <div className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>C</Kbd>
          </div>
        </div>
      </Stack>
    </div>
  ),
};
