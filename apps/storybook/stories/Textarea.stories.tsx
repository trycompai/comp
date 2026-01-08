import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Textarea } from '@trycompai/design-system';

const meta = {
  title: 'Atoms/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: () => (
    <Stack gap="4">
      <Textarea size="sm" placeholder="Small" />
      <Textarea placeholder="Default" />
      <Textarea size="lg" placeholder="Large" />
    </Stack>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled textarea',
  },
};
